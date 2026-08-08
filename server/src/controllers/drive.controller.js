import { Drive } from '../models/Drive.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadCohort } from '../services/cohort.service.js';
import { parseJobDescription, rankStudents } from '../services/jobMatch.js';

export const listDrives = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};

  const drives = await Drive.find(filter)
    .select('company role package location driveDate status shortlist requirements')
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
  const drive = await Drive.create({
    ...req.body,
    requirements: parseJobDescription(req.body.description),
    createdBy: req.user._id,
  });

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

  const candidates = ranked.map((student) => ({
    _id: student._id,
    name: student.name,
    email: student.email,
    branch: student.branch,
    graduationYear: student.graduationYear,
    readiness: student.readiness,
    band: student.band,
    solved: student.solved,
    verifiedSkills: student.verifiedSkills,
    match: student.match,
    // Eligibility is the college's bar on top of the JD's own filters.
    eligible: student.match.blockers.length === 0 && student.readiness >= (drive.minReadiness ?? 0),
    shortlisted: shortlisted.get(String(student._id)) ?? null,
  }));

  res.json({
    success: true,
    data: {
      drive,
      candidates,
      summary: {
        considered: candidates.length,
        eligible: candidates.filter((item) => item.eligible).length,
        strong: candidates.filter((item) => item.eligible && item.match.score >= 70).length,
        shortlisted: drive.shortlist.length,
      },
    },
  });
});

/**
 * Adds students to the shortlist.
 *
 * Bulk by design — an officer shortlists forty people at once, not one at a
 * time — and idempotent, so re-running a selection does not duplicate rows.
 */
export const addToShortlist = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;

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
      })),
    );
    await drive.save();
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

  if (stage) entry.stage = stage;
  if (notes !== undefined) entry.notes = notes;
  await drive.save();

  res.json({ success: true, data: { entry } });
});

export const updateDrive = asyncHandler(async (req, res) => {
  const update = { ...req.body };
  if (req.body.description) update.requirements = parseJobDescription(req.body.description);

  const drive = await Drive.findByIdAndUpdate(req.params.driveId, update, {
    new: true,
    runValidators: true,
  });

  if (!drive) throw new ApiError(404, 'Drive not found.');
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
