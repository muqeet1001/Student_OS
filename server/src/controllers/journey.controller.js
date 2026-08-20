import { ActionItem, InstitutionConfig, MentorAppointment, StudentJourney } from '../models/StudentJourney.js';
import { Profile } from '../models/Profile.js';
import { User } from '../models/User.js';
import { PlacementEvent } from '../models/PlacementEvent.js';
import { Application } from '../models/JobPosting.js';
import { StudentDocument } from '../models/Document.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadCohort } from '../services/cohort.service.js';
import { deliverAction } from '../services/actionDelivery.service.js';
import { recordAudit } from '../services/audit.service.js';

function currentConsents(history = []) {
  return Object.values(
    history.reduce((latest, entry) => {
      latest[entry.key] = entry;
      return latest;
    }, {}),
  );
}

async function institution() {
  return InstitutionConfig.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
}

export const getJourney = asyncHandler(async (req, res) => {
  const [journey, actions, appointments, config] = await Promise.all([
    StudentJourney.findOrCreateFor(req.user._id),
    ActionItem.find({ owner: req.user._id, status: 'todo' })
      .populate('assignedBy', 'name')
      .sort({ dueAt: 1, createdAt: -1 })
      .limit(20)
      .lean(),
    MentorAppointment.find({ student: req.user._id })
      .populate('mentor', 'name headline avatarUrl')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    institution(),
  ]);

  res.json({
    success: true,
    data: {
      journey: {
        ...journey.toJSON(),
        onboardingComplete: Boolean(journey.onboarding?.completedAt),
        consents: currentConsents(journey.consentHistory),
      },
      actions,
      appointments,
      institution: config,
    },
  });
});

export const completeOnboarding = asyncHandler(async (req, res) => {
  const { targetRole, graduationYear, branch, targetCompanies, placementDate, weeklyGoal, consents } = req.body;

  const [profile, journey] = await Promise.all([
    Profile.findOrCreateFor(req.user._id),
    StudentJourney.findOrCreateFor(req.user._id),
  ]);

  profile.targetRole = targetRole;
  profile.graduationYear = graduationYear;
  profile.branch = branch;
  profile.targetCompanies = targetCompanies;

  journey.onboarding.completedAt = new Date();
  journey.onboarding.placementDate = placementDate;
  journey.onboarding.weeklyGoal = weeklyGoal;
  journey.consentHistory.push(
    ...consents.map((entry) => ({ ...entry, source: 'onboarding', recordedAt: new Date() })),
  );

  await Promise.all([profile.save(), journey.save()]);

  res.json({
    success: true,
    data: {
      onboardingComplete: true,
      targetRole,
      placementDate,
      next: '/dashboard',
    },
  });
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const journey = await StudentJourney.findOrCreateFor(req.user._id);
  if (req.body.locale) journey.locale = req.body.locale;
  if (req.body.channels) {
    for (const key of ['email', 'whatsapp']) {
      if (key in req.body.channels && journey.channels[key] !== req.body.channels[key]) {
        journey.consentHistory.push({ key, granted: req.body.channels[key], source: 'settings', recordedAt: new Date() });
      }
    }
    Object.assign(journey.channels, req.body.channels);
  }
  await journey.save();
  res.json({ success: true, data: { locale: journey.locale, channels: journey.channels } });
});

export const recordConsent = asyncHandler(async (req, res) => {
  const journey = await StudentJourney.findOrCreateFor(req.user._id);
  journey.consentHistory.push({ ...req.body, recordedAt: new Date() });
  await journey.save();
  res.status(201).json({
    success: true,
    data: { consents: currentConsents(journey.consentHistory), history: journey.consentHistory },
  });
});

export const createAction = asyncHandler(async (req, res) => {
  let owner = req.user._id;
  let source = 'self';
  let assignedBy = null;

  if (req.body.owner && String(req.body.owner) !== String(req.user._id)) {
    if (req.user.role !== 'admin') throw ApiError.forbidden('You can only create reminders for yourself');
    const student = await User.findOne({ _id: req.body.owner, role: 'student' }).select('_id').lean();
    if (!student) throw ApiError.notFound('Student not found');
    owner = student._id;
    source = 'staff';
    assignedBy = req.user._id;
  }

  const { owner: _ignored, ...body } = req.body;
  const action = await ActionItem.create({
    ...body,
    owner,
    source,
    assignedBy,
    staffOwner: source === 'staff' ? req.user._id : null,
  });
  let delivery = [{ channel: 'in-app', status: 'recorded' }];
  if (source === 'staff') {
    const [recipient, journey, config] = await Promise.all([
      User.findById(owner).select('name email').lean(),
      StudentJourney.findOrCreateFor(owner),
      institution(),
    ]);
    const profile = await Profile.findOne({ user: owner }).select('phone').lean();
    delivery = await deliverAction({ action, recipient: { ...recipient, phone: profile?.phone || '' }, journey, institution: config });
    await recordAudit({
      actor: req.user._id,
      action: 'student-action.created',
      entityType: 'student-action',
      entityId: action._id,
      summary: `Assigned “${action.title}” to ${recipient?.name || 'a student'}`,
      metadata: { student: owner, dueAt: action.dueAt, priority: action.priority },
    });
  }
  res.status(201).json({ success: true, data: { action, delivery } });
});

/** Assigns one action to a filtered cohort without repeated manual entry. */
export const createBulkActions = asyncHandler(async (req, res) => {
  const { owners, ...fields } = req.body;
  const recipients = await User.find({ _id: { $in: owners }, role: 'student' }).select('_id').lean();
  if (recipients.length !== new Set(owners.map(String)).size) {
    throw new ApiError(400, 'One or more selected recipients are not students.');
  }

  const actions = await ActionItem.insertMany(recipients.map((student) => ({
    ...fields,
    owner: student._id,
    source: 'staff',
    assignedBy: req.user._id,
    staffOwner: req.user._id,
  })));

  await recordAudit({
    actor: req.user._id,
    action: 'student-action.bulk-created',
    entityType: 'student-action',
    entityId: actions[0]?._id,
    summary: `Assigned “${fields.title}” to ${actions.length} students`,
    metadata: { owners, dueAt: fields.dueAt, priority: fields.priority },
  });

  res.status(201).json({ success: true, data: { created: actions.length } });
});

async function actionFor(req) {
  const action = await ActionItem.findById(req.params.actionId);
  if (!action) throw ApiError.notFound('Action not found');
  if (req.user.role !== 'admin' && String(action.owner) !== String(req.user._id)) {
    throw ApiError.notFound('Action not found');
  }
  return action;
}

export const updateAction = asyncHandler(async (req, res) => {
  const action = await actionFor(req);
  action.set(req.body);
  if (req.body.status && req.body.status !== 'todo') action.resolvedAt = new Date();
  if (req.body.status === 'todo') action.resolvedAt = null;
  await action.save();
  if (req.user.role === 'admin') {
    await recordAudit({
      actor: req.user._id,
      action: 'student-action.updated',
      entityType: 'student-action',
      entityId: action._id,
      summary: `Updated student action “${action.title}”`,
      metadata: req.body,
    });
  }
  res.json({ success: true, data: { action } });
});

export const addActionMessage = asyncHandler(async (req, res) => {
  const action = await actionFor(req);
  action.messages.push({ author: req.user._id, body: req.body.body });
  await action.save();
  await action.populate('messages.author', 'name role');
  res.status(201).json({ success: true, data: { action } });
});

async function buildActionCenter(userId) {
  const now = new Date();
  const horizon = new Date(Date.now() + 120 * 86_400_000);
  const [actions, events, applications, expiringDocuments] = await Promise.all([
    ActionItem.find({ owner: userId, status: 'todo' })
      .populate('assignedBy', 'name')
      .populate('messages.author', 'name role')
      .sort({ dueAt: 1, createdAt: -1 })
      .lean(),
    PlacementEvent.find({
      status: { $ne: 'cancelled' },
      startsAt: { $gte: now, $lte: horizon },
      $or: [{ audience: 'college' }, { 'slots.student': userId }],
    })
      .sort({ startsAt: 1 })
      .lean(),
    Application.find({ user: userId, stage: { $nin: ['rejected', 'offer'] } })
      .populate('job', 'title company deadline')
      .sort({ followUpAt: 1 })
      .lean(),
    StudentDocument.find({ owner: userId, expiresAt: { $gte: now, $lte: horizon } })
      .sort({ expiresAt: 1 })
      .lean(),
  ]);

  const entries = [
    ...actions.map((item) => ({
      id: `action:${item._id}`,
      source: 'action',
      category: item.category,
      title: item.title,
      detail: item.description || (item.assignedBy ? `Assigned by ${item.assignedBy.name}` : 'Personal reminder'),
      at: item.dueAt,
      link: item.link || '/updates',
      action: item,
    })),
    ...events.map((event) => {
      const slot = event.slots?.find((entry) => String(entry.student) === String(userId));
      return {
        id: `event:${event._id}`,
        source: 'calendar',
        category: event.type,
        title: event.title,
        detail: [event.company, slot?.venue || event.venue].filter(Boolean).join(' · '),
        at: slot?.startsAt || event.startsAt,
        link: '/calendar',
      };
    }),
    ...applications.flatMap((application) => {
      const result = [];
      if (application.job?.deadline && new Date(application.job.deadline) >= now) {
        result.push({
          id: `job:${application.job._id}`,
          source: 'application',
          category: 'application',
          title: `${application.job.company}: ${application.job.title}`,
          detail: `Application deadline · Stage: ${application.stage}`,
          at: application.job.deadline,
          link: `/jobs/${application.job._id}`,
        });
      }
      if (application.followUpAt && new Date(application.followUpAt) >= now) {
        result.push({
          id: `followup:${application._id}`,
          source: 'application',
          category: 'follow-up',
          title: `Follow up with ${application.job?.company || 'employer'}`,
          detail: application.contactName || application.notes || 'Application follow-up',
          at: application.followUpAt,
          link: '/tracker',
        });
      }
      return result;
    }),
    ...expiringDocuments.map((document) => ({
      id: `document:${document._id}`,
      source: 'document',
      category: 'document',
      title: `Replace ${document.title}`,
      detail: 'Document expires soon',
      at: document.expiresAt,
      link: '/documents',
    })),
  ];

  return entries.sort((a, b) => {
    if (!a.at) return 1;
    if (!b.at) return -1;
    return new Date(a.at) - new Date(b.at);
  });
}

export const getActionCenter = asyncHandler(async (req, res) => {
  const entries = await buildActionCenter(req.user._id);
  res.json({
    success: true,
    data: {
      entries,
      overdue: entries.filter((entry) => entry.at && new Date(entry.at) < new Date()).length,
      upcoming: entries.filter((entry) => !entry.at || new Date(entry.at) >= new Date()).length,
    },
  });
});

export const getBenchmarks = asyncHandler(async (req, res) => {
  const rows = await loadCohort({});
  const me = rows.find((row) => String(row._id) === String(req.user._id));
  const average = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  const cohortScores = rows.map((row) => row.readiness);
  const comparable = me
    ? rows.filter((row) => row.profile?.branch === me.profile?.branch && row.profile?.graduationYear === me.profile?.graduationYear)
    : [];
  const belowOrEqual = me ? cohortScores.filter((score) => score <= me.readiness).length : 0;
  res.json({
    success: true,
    data: {
      myScore: me?.readiness ?? null,
      institutionAverage: average(cohortScores),
      comparableAverage: average(comparable.map((row) => row.readiness)),
      comparableSize: comparable.length,
      percentile: me && cohortScores.length ? Math.round((belowOrEqual / cohortScores.length) * 100) : null,
      context: me ? { branch: me.profile?.branch || null, graduationYear: me.profile?.graduationYear || null } : null,
      note: 'Benchmarks describe this cohort; they do not change readiness or eligibility.',
    },
  });
});

function icsEscape(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function icsDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export const exportCalendar = asyncHandler(async (req, res) => {
  const entries = (await buildActionCenter(req.user._id)).filter((entry) => entry.at);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Student OS//Placement Journey//EN', 'CALSCALE:GREGORIAN'];
  for (const entry of entries) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${icsEscape(entry.id)}@student-os`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(entry.at)}`,
      `SUMMARY:${icsEscape(entry.title)}`,
      `DESCRIPTION:${icsEscape(entry.detail)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');

  const journey = await StudentJourney.findOrCreateFor(req.user._id);
  journey.integrations.calendar = 'ics';
  await journey.save();

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="student-os-calendar.ics"');
  res.send(`${lines.join('\r\n')}\r\n`);
});

export const requestMentor = asyncHandler(async (req, res) => {
  const appointment = await MentorAppointment.create({ student: req.user._id, ...req.body });
  res.status(201).json({ success: true, data: { appointment } });
});

export const updateMentor = asyncHandler(async (req, res) => {
  const appointment = await MentorAppointment.findByIdAndUpdate(req.params.appointmentId, req.body, {
    new: true,
    runValidators: true,
  });
  if (!appointment) throw ApiError.notFound('Mentoring request not found');
  res.json({ success: true, data: { appointment } });
});

export const listStaffActions = asyncHandler(async (req, res) => {
  const filter = req.query.student ? { owner: req.query.student } : { source: 'staff' };
  let scopedStudents = null;
  if (req.query.graduationYear) {
    scopedStudents = await Profile.find({ graduationYear: Number(req.query.graduationYear) }).select('user').lean();
    filter.owner = { $in: scopedStudents.map((profile) => profile.user) };
  }
  const appointmentFilter = scopedStudents
    ? { student: { $in: scopedStudents.map((profile) => profile.user) } }
    : {};
  const [actions, appointments] = await Promise.all([
    ActionItem.find(filter)
      .populate('owner', 'name email')
      .populate('assignedBy', 'name')
      .populate('staffOwner', 'name email')
      .sort({ status: 1, dueAt: 1, createdAt: -1 })
      .limit(300)
      .lean(),
    MentorAppointment.find(appointmentFilter).populate('student', 'name email').populate('mentor', 'name').sort({ createdAt: -1 }).limit(200).lean(),
  ]);
  res.json({ success: true, data: { actions, appointments } });
});

export const getInstitution = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { institution: await institution() } });
});

export const updateInstitution = asyncHandler(async (req, res) => {
  const config = await InstitutionConfig.findOneAndUpdate(
    { key: 'default' },
    { $set: req.body, $setOnInsert: { key: 'default' } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  res.json({ success: true, data: { institution: config } });
});

const csvCell = (value) => {
  const raw = String(value ?? '');
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
};

export const exportSisRoster = asyncHandler(async (_req, res) => {
  const users = await User.find({ role: 'student' }).select('name email').sort({ name: 1 }).lean();
  const profiles = await Profile.find({ user: { $in: users.map((user) => user._id) } })
    .select('user externalStudentId branch graduationYear')
    .lean();
  const byUser = new Map(profiles.map((profile) => [String(profile.user), profile]));
  const rows = [
    ['externalStudentId', 'name', 'email', 'branch', 'graduationYear'],
    ...users.map((user) => {
      const profile = byUser.get(String(user._id));
      return [profile?.externalStudentId, user.name, user.email, profile?.branch, profile?.graduationYear];
    }),
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="student-os-sis-roster.csv"');
  res.send(`${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`);
});

export const syncSisRoster = asyncHandler(async (req, res) => {
  const config = await institution();
  if (config.providers?.sis === 'none') throw ApiError.conflict('Enable CSV or API SIS integration in institution settings first.');
  const updated = [];
  const unmatched = [];
  for (const row of req.body.rows) {
    const user = await User.findOne({ email: row.email.toLowerCase(), role: 'student' });
    if (!user) {
      unmatched.push({ email: row.email, reason: 'No Student OS account has this email.' });
      continue;
    }
    if (row.name) user.name = row.name;
    const profile = await Profile.findOrCreateFor(user._id);
    profile.externalStudentId = row.externalStudentId;
    if (row.branch) profile.branch = row.branch;
    if (row.graduationYear) profile.graduationYear = row.graduationYear;
    await Promise.all([user.save(), profile.save(), StudentJourney.updateOne({ user: user._id }, { $set: { 'integrations.sis': 'managed' }, $setOnInsert: { user: user._id } }, { upsert: true })]);
    updated.push({ user: user._id, email: user.email, externalStudentId: profile.externalStudentId });
  }
  res.json({ success: true, data: { updated, unmatched, total: req.body.rows.length } });
});
