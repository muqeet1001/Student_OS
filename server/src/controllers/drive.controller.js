import { Drive } from '../models/Drive.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadCohort } from '../services/cohort.service.js';
import { parseJobDescription, rankStudents } from '../services/jobMatch.js';
import { recordAudit } from '../services/audit.service.js';
import { PlacementEvent } from '../models/PlacementEvent.js';
import { Announcement } from '../models/Announcement.js';
import { Offer } from '../models/Offer.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { ActionItem } from '../models/StudentJourney.js';

async function automateCandidateAction({ drive, student, stage, actor }) {
  const recipes = {
    invited: { title: `Apply to ${drive.company} — ${drive.role}`, category: 'application', priority: 'high', link: '/opportunities' },
    shortlisted: { title: `Prepare for ${drive.company} selection rounds`, category: 'preparation', priority: 'high', link: '/my-plan' },
    'technical-interview': { title: `Review your ${drive.company} technical interview slot`, category: 'meeting', priority: 'urgent', link: '/calendar' },
    'hr-interview': { title: `Prepare for ${drive.company} HR interview`, category: 'meeting', priority: 'urgent', link: '/calendar' },
  };
  const recipe = recipes[stage];
  if (!recipe) return;
  await ActionItem.findOneAndUpdate(
    { owner: student, signalKey: `drive:${drive._id}:${stage}`, status: 'todo' },
    { $setOnInsert: { owner: student, drive: drive._id, source: 'system', assignedBy: actor, staffOwner: drive.ownedBy || actor, dueAt: drive.applicationDeadline || drive.driveDate || null, description: `Automatically created when your candidate stage changed to ${stage.replaceAll('-', ' ')}.`, reminderChannels: ['in-app'], signalKey: `drive:${drive._id}:${stage}`, ...recipe } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export const listDrives = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};

  const drives = await Drive.find(filter)
    .select('company role package location driveDate applicationDeadline status shortlist requirements nextAction nextActionDueAt ownedBy')
    .sort({ driveDate: -1, createdAt: -1 })
    .lean({ virtuals: true });

  res.json({
    success: true,
    data: {
      drives: drives.map(({ shortlist, ...drive }) => ({
        ...drive,
        shortlistCount: shortlist.length,
        selectedCount: shortlist.filter((entry) => entry.stage === 'selected').length,
      })),
    },
  });
});

export const createDrive = asyncHandler(async (req, res) => {
  const parsedRequirements = parseJobDescription(req.body.description);
  const drive = await Drive.create({
    ...req.body,
    requirements: { ...parsedRequirements, ...(req.body.requirements ?? {}) },
    createdBy: req.user._id,
    ownedBy: req.user._id,
  });
  await recordAudit({ actor: req.user._id, action: 'drive.created', entityType: 'drive', entityId: drive._id, summary: `Created ${drive.company} — ${drive.role}`, metadata: { status: drive.status, driveDate: drive.driveDate } });

  res.status(201).json({ success: true, data: { drive } });
});

/**
 * A drive with its eligible pool.
 *
 * The pool is computed live rather than stored: a student who verifies a
 * skill on Tuesday should appear in Wednesday's shortlist without anyone
 * re-running anything.
 */
export const getDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.driveId).lean({ virtuals: true });
  if (!drive) throw new ApiError(404, 'Drive not found.');

  const cohort = await loadCohort({});
  const ranked = rankStudents(cohort, drive.requirements, { limit: cohort.length });

  const shortlisted = new Map(
    drive.shortlist.map((entry) => [String(entry.student), entry]),
  );

  const latestOverride = new Map();
  for (const override of drive.eligibilityOverrides ?? []) {
    latestOverride.set(String(override.student), override);
  }

  const candidates = ranked.map((student) => {
    const baseState = student.match.blockers.length || student.readiness < (drive.minReadiness ?? 0)
      ? 'not-eligible'
      : student.match.verificationIssues?.length
        ? 'needs-verification'
        : student.match.score >= 70 ? 'recommended' : 'eligible';
    const override = latestOverride.get(String(student._id));
    const eligibilityState = override && override.decision !== 'clear'
      ? override.decision === 'eligible' ? (student.match.score >= 70 ? 'recommended' : 'eligible') : 'not-eligible'
      : baseState;
    return {
      _id: student._id,
      name: student.name,
      email: student.email,
      branch: student.branch,
      graduationYear: student.graduationYear,
      cgpa: student.cgpa,
      readiness: student.readiness,
      band: student.band,
      solved: student.solved,
      verifiedSkills: student.verifiedSkills,
      match: student.match,
      baseEligibilityState: baseState,
      eligibilityState,
      eligible: ['eligible', 'recommended'].includes(eligibilityState),
      recommended: eligibilityState === 'recommended',
      eligibilityOverride: override ?? null,
      shortlisted: shortlisted.get(String(student._id)) ?? null,
    };
  });

  const [events, communications, offers, activity, actions] = await Promise.all([
    PlacementEvent.find({ drive: drive._id }).populate('slots.student', 'name email').sort({ startsAt: 1 }).lean({ virtuals: true }),
    Announcement.find({ 'audience.drive': drive._id }).select('subject audience recipients sentAt sentBy emailAvailable emailNote').populate('sentBy', 'name').sort({ sentAt: -1 }).lean({ virtuals: true }),
    Offer.find({ drive: drive._id }).populate('student', 'name email').sort({ offeredAt: -1 }).lean(),
    AuditEvent.find({ entityType: 'drive', entityId: drive._id }).populate('actor', 'name email').sort({ createdAt: -1 }).limit(100).lean(),
    ActionItem.find({ drive: drive._id, status: 'todo' }).populate('owner', 'name email').populate('staffOwner', 'name').sort({ dueAt: 1 }).lean(),
  ]);

  const now = Date.now();
  const stuckCandidates = candidates.filter((candidate) => {
    if (!candidate.shortlisted || ['joined', 'rejected', 'withdrawn'].includes(candidate.shortlisted.stage)) return false;
    const last = candidate.shortlisted.stageHistory?.at(-1)?.changedAt || candidate.shortlisted.addedAt;
    return last && now - new Date(last).getTime() > 7 * 86_400_000;
  });
  const slots = events.flatMap((event) => event.slots ?? []);

  res.json({
    success: true,
    data: {
      drive,
      candidates,
      summary: {
        considered: candidates.length,
        eligible: candidates.filter((item) => item.eligible).length,
        strong: candidates.filter((item) => item.eligible && item.match.score >= 70).length,
        needsVerification: candidates.filter((item) => item.eligibilityState === 'needs-verification').length,
        shortlisted: drive.shortlist.length,
        interviews: events.filter((event) => event.type === 'interview').length,
        scheduled: slots.filter((slot) => slot.status === 'scheduled').length,
        attended: slots.filter((slot) => slot.status === 'attended').length,
        noShows: slots.filter((slot) => slot.status === 'no-show').length,
        offers: offers.length,
        joined: offers.filter((offer) => offer.status === 'joined').length,
        stuck: stuckCandidates.length,
      },
      operations: { events, communications, offers, activity, actions, stuckCandidates },
    },
  });
});

export const overrideEligibility = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.driveId);
  if (!drive) throw new ApiError(404, 'Drive not found.');
  const student = await User.findOne({ _id: req.params.studentId, role: 'student' }).select('name');
  if (!student) throw new ApiError(404, 'Student not found.');

  const decision = {
    student: student._id,
    decision: req.body.decision,
    reason: req.body.reason,
    originalState: req.body.originalState,
    officer: req.user._id,
    decidedAt: new Date(),
  };
  drive.eligibilityOverrides.push(decision);
  await drive.save();
  await recordAudit({
    actor: req.user._id,
    action: 'drive.eligibility-overridden',
    entityType: 'drive',
    entityId: drive._id,
    summary: `${req.body.decision === 'clear' ? 'Cleared eligibility override for' : `Marked ${req.body.decision}:`} ${student.name}`,
    metadata: { student: student._id, ...req.body },
  });
  res.json({ success: true, data: { override: drive.eligibilityOverrides.at(-1) } });
});

/**
 * Adds students to the shortlist.
 *
 * Bulk by design — an officer shortlists forty people at once, not one at a
 * time — and idempotent, so re-running a selection does not duplicate rows.
 */
export const addToShortlist = asyncHandler(async (req, res) => {
  const { studentIds, stage = 'shortlisted' } = req.body;

  const drive = await Drive.findById(req.params.driveId);
  if (!drive) throw new ApiError(404, 'Drive not found.');

  const existing = new Set(drive.shortlist.map((entry) => String(entry.student)));
  const toAdd = studentIds.filter((id) => !existing.has(String(id)));

  if (toAdd.length > 0) {
    // Score at the moment of shortlisting, so the record reflects the
    // decision that was actually made.
    const cohort = await loadCohort({});
    const ranked = rankStudents(cohort, drive.requirements, { limit: cohort.length });
    const scoreById = new Map(ranked.map((student) => [String(student._id), student.match.score]));

    drive.shortlist.push(
      ...toAdd.map((student) => ({
        student,
        matchAtShortlist: scoreById.get(String(student)) ?? null,
        stage,
        stageHistory: [{ from: '', to: stage, changedBy: req.user._id, note: 'Added to drive pipeline' }],
      })),
    );
    await drive.save();
    await Promise.all(toAdd.map((student) => automateCandidateAction({ drive, student, stage, actor: req.user._id })));
    await recordAudit({ actor: req.user._id, action: 'drive.shortlist.updated', entityType: 'drive', entityId: drive._id, summary: `Added ${toAdd.length} candidate${toAdd.length === 1 ? '' : 's'} to ${drive.company} — ${drive.role}`, metadata: { added: toAdd } });
  }

  res.json({
    success: true,
    data: { added: toAdd.length, shortlistCount: drive.shortlist.length },
  });
});

export const removeFromShortlist = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.driveId);
  if (!drive) throw new ApiError(404, 'Drive not found.');

  drive.shortlist = drive.shortlist.filter(
    (entry) => String(entry.student) !== String(req.params.studentId),
  );
  await drive.save();
  await recordAudit({ actor: req.user._id, action: 'drive.shortlist.removed', entityType: 'drive', entityId: drive._id, summary: `Removed a candidate from ${drive.company} — ${drive.role}`, metadata: { student: req.params.studentId } });

  res.json({ success: true, data: { shortlistCount: drive.shortlist.length } });
});

/** Moves a shortlisted student through the selection pipeline. */
export const updateShortlistEntry = asyncHandler(async (req, res) => {
  const { stage, notes } = req.body;

  const drive = await Drive.findById(req.params.driveId);
  if (!drive) throw new ApiError(404, 'Drive not found.');

  const entry = drive.shortlist.find(
    (item) => String(item.student) === String(req.params.studentId),
  );
  if (!entry) throw new ApiError(404, 'That student is not on this shortlist.');

  if (stage && stage !== entry.stage) {
    entry.stageHistory.push({ from: entry.stage, to: stage, changedBy: req.user._id, note: notes || '' });
    entry.stage = stage;
  }
  if (notes !== undefined) entry.notes = notes;
  await drive.save();
  if (stage) await automateCandidateAction({ drive, student: entry.student, stage: entry.stage, actor: req.user._id });
  await recordAudit({ actor: req.user._id, action: 'drive.candidate-stage.updated', entityType: 'drive', entityId: drive._id, summary: `Moved a candidate to ${entry.stage} for ${drive.company} — ${drive.role}`, metadata: { student: req.params.studentId, stage: entry.stage } });

  res.json({ success: true, data: { entry } });
});

/** Moves a filtered candidate set in one audited operation. */
export const bulkUpdateCandidateStage = asyncHandler(async (req, res) => {
  const { studentIds, stage, note = '' } = req.body;
  const drive = await Drive.findById(req.params.driveId);
  if (!drive) throw new ApiError(404, 'Drive not found.');

  const wanted = new Set(studentIds.map(String));
  let updated = 0;
  for (const entry of drive.shortlist) {
    if (!wanted.has(String(entry.student)) || entry.stage === stage) continue;
    entry.stageHistory.push({ from: entry.stage, to: stage, changedBy: req.user._id, note });
    entry.stage = stage;
    if (note) entry.notes = note;
    updated += 1;
  }

  if (!updated) throw new ApiError(400, 'None of those students are available for this stage change.');
  await drive.save();
  await Promise.all(drive.shortlist.filter((entry) => wanted.has(String(entry.student)) && entry.stage === stage).map((entry) => automateCandidateAction({ drive, student: entry.student, stage, actor: req.user._id })));
  await recordAudit({
    actor: req.user._id,
    action: 'drive.candidate-stage.bulk-updated',
    entityType: 'drive',
    entityId: drive._id,
    summary: `Moved ${updated} candidates to ${stage} for ${drive.company} — ${drive.role}`,
    metadata: { students: studentIds, stage, note },
  });

  res.json({ success: true, data: { updated, stage } });
});

export const updateDrive = asyncHandler(async (req, res) => {
  const update = { ...req.body };
  if (req.body.description) {
    update.requirements = { ...parseJobDescription(req.body.description), ...(req.body.requirements ?? {}) };
  }

  const drive = await Drive.findByIdAndUpdate(req.params.driveId, update, {
    new: true,
    runValidators: true,
  });

  if (!drive) throw new ApiError(404, 'Drive not found.');
  await recordAudit({ actor: req.user._id, action: 'drive.updated', entityType: 'drive', entityId: drive._id, summary: `Updated ${drive.company} — ${drive.role}`, metadata: req.body });
  res.json({ success: true, data: { drive } });
});

export const deleteDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.findByIdAndDelete(req.params.driveId);
  if (!drive) throw new ApiError(404, 'Drive not found.');

  res.json({ success: true, data: { message: 'Drive deleted.' } });
});

/** The shortlist as CSV, for sending to the recruiter. */
export const exportShortlist = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.driveId).lean();
  if (!drive) throw new ApiError(404, 'Drive not found.');

  const students = await User.find({ _id: { $in: drive.shortlist.map((e) => e.student) } })
    .select('name email')
    .lean();

  const byId = new Map(students.map((student) => [String(student._id), student]));

  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const csv = [
    'Name,Email,Match,Stage,Notes',
    ...drive.shortlist.map((entry) => {
      const student = byId.get(String(entry.student));
      return [
        escape(student?.name),
        escape(student?.email),
        entry.matchAtShortlist ?? '',
        entry.stage,
        escape(entry.notes),
      ].join(',');
    }),
  ].join('\n');

  const slug = `${drive.company}-${drive.role}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="shortlist-${slug}.csv"`);
  res.send(csv);
});
