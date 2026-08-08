import { Application, JobPosting } from '../models/JobPosting.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadCohort } from '../services/cohort.service.js';
import { parseJobDescription, scoreStudent } from '../services/jobMatch.js';

/** Loads the signed-in student once; every match on the page reuses it. */
async function loadMe(user) {
  const [me] = await loadCohort({ search: user.email });
  return me ?? null;
}

export const listJobs = asyncHandler(async (req, res) => {
  const {
    search = '',
    type = '',
    workMode = '',
    company = '',
    saved = '',
    applied = '',
    sort = 'match',
    page = 1,
    limit = 12,
  } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(50, Math.max(1, Number(limit) || 12));

  const filter = { active: true };
  if (type) filter.type = type;
  if (workMode) filter.workMode = workMode;
  if (company) filter.company = new RegExp(`^${company}$`, 'i');
  if (search) {
    filter.$or = [{ title: new RegExp(search, 'i') }, { company: new RegExp(search, 'i') }];
  }

  const [jobs, me, applications] = await Promise.all([
    JobPosting.find(filter).sort({ deadline: 1, createdAt: -1 }).lean({ virtuals: true }),
    loadMe(req.user),
    Application.find({ user: req.user._id }).select('job stage').lean(),
  ]);

  const stageByJob = new Map(applications.map((item) => [String(item.job), item.stage]));

  let rows = jobs.map((job) => {
    // Scoring uses the stored parse, so a listing of 50 jobs does not
    // re-parse 50 descriptions on every request.
    const match = me ? scoreStudent(me, job.requirements) : null;
    const stage = stageByJob.get(String(job._id)) ?? null;

    return {
      _id: job._id,
      title: job.title,
      company: job.company,
      type: job.type,
      workMode: job.workMode,
      location: job.location,
      compensation: job.compensation,
      deadline: job.deadline,
      isOpen: job.isOpen,
      skills: job.requirements.skills,
      match,
      stage,
    };
  });

  if (saved === 'true') rows = rows.filter((row) => row.stage === 'saved');
  if (applied === 'true') rows = rows.filter((row) => row.stage && row.stage !== 'saved');

  const sorters = {
    match: (a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0),
    deadline: (a, b) => new Date(a.deadline ?? 8.64e15) - new Date(b.deadline ?? 8.64e15),
    recent: () => 0,
  };
  rows.sort(sorters[sort] ?? sorters.match);

  res.json({
    success: true,
    data: {
      jobs: rows.slice((pageNum - 1) * perPage, pageNum * perPage),
      pagination: {
        page: pageNum,
        limit: perPage,
        total: rows.length,
        pages: Math.ceil(rows.length / perPage) || 1,
      },
      filters: {
        types: ['full-time', 'internship', 'campus', 'apprenticeship', 'hackathon'],
        workModes: ['remote', 'hybrid', 'on-site'],
        companies: [...new Set(jobs.map((job) => job.company))].sort(),
      },
    },
  });
});

export const getJob = asyncHandler(async (req, res) => {
  const job = await JobPosting.findById(req.params.jobId).lean({ virtuals: true });
  if (!job) throw new ApiError(404, 'Job not found.');

  const [me, application] = await Promise.all([
    loadMe(req.user),
    Application.findOne({ user: req.user._id, job: job._id }).lean(),
  ]);

  const match = me ? scoreStudent(me, job.requirements) : null;

  /*
   * "What would this be worth if I closed the gaps?" is the question that
   * turns a rejection into a plan, so the potential score is computed by
   * re-scoring with the missing skills granted.
   */
  let potential = null;
  if (me && match && match.missing.length > 0) {
    const withSkills = {
      ...me,
      profile: {
        ...me.profile,
        skills: [
          ...(me.profile.skills ?? []),
          ...match.missing.map((item) => ({ name: item.name, verified: false })),
        ],
      },
    };
    potential = scoreStudent(withSkills, job.requirements).score;
  }

  res.json({
    success: true,
    data: {
      job,
      match,
      potential,
      application: application ?? null,
      readiness: me?.readiness ?? 0,
    },
  });
});

/** Saves or applies. One row per student per job, so this is an upsert. */
export const trackJob = asyncHandler(async (req, res) => {
  const { stage = 'saved', notes } = req.body;

  const job = await JobPosting.findById(req.params.jobId).lean();
  if (!job) throw new ApiError(404, 'Job not found.');

  const existing = await Application.findOne({ user: req.user._id, job: job._id });

  // The match is recorded the first time a student actually applies, so the
  // tracker keeps what was true then rather than what is true now.
  let matchAtApply = existing?.matchAtApply ?? null;
  if (stage !== 'saved' && matchAtApply == null) {
    const me = await loadMe(req.user);
    if (me) matchAtApply = scoreStudent(me, job.requirements).score;
  }

  const application = await Application.findOneAndUpdate(
    { user: req.user._id, job: job._id },
    {
      stage,
      ...(notes !== undefined && { notes }),
      ...(matchAtApply != null && { matchAtApply }),
      ...(stage !== 'saved' && !existing?.appliedAt && { appliedAt: new Date() }),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.json({ success: true, data: { application } });
});

export const untrackJob = asyncHandler(async (req, res) => {
  await Application.findOneAndDelete({ user: req.user._id, job: req.params.jobId });
  res.json({ success: true, data: { message: 'Removed.' } });
});

/** The placement tracker: every application grouped by pipeline stage. */
export const listApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ user: req.user._id })
    .populate('job', 'title company type workMode deadline location')
    .sort({ updatedAt: -1 })
    .lean();

  const STAGES = ['saved', 'applied', 'assessment', 'interview', 'offer', 'rejected'];

  res.json({
    success: true,
    data: {
      stages: STAGES.map((stage) => ({
        key: stage,
        items: applications.filter((item) => item.stage === stage),
      })),
      total: applications.length,
    },
  });
});

/** Top matches for the dashboard's "Jobs for you". */
export const topMatches = asyncHandler(async (req, res) => {
  const [jobs, me] = await Promise.all([
    JobPosting.find({ active: true }).lean({ virtuals: true }),
    loadMe(req.user),
  ]);

  const ranked = jobs
    .filter((job) => job.isOpen)
    .map((job) => ({
      _id: job._id,
      title: job.title,
      company: job.company,
      type: job.type,
      deadline: job.deadline,
      match: me ? scoreStudent(me, job.requirements) : null,
    }))
    .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))
    .slice(0, 4);

  res.json({ success: true, data: { jobs: ranked } });
});

/** Staff post an opportunity; the description is parsed once, here. */
export const createJob = asyncHandler(async (req, res) => {
  const job = await JobPosting.create({
    ...req.body,
    requirements: parseJobDescription(req.body.description),
    postedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: { job } });
});

export const updateJob = asyncHandler(async (req, res) => {
  const update = { ...req.body };
  // Keep the stored parse in step with the text it came from.
  if (req.body.description) update.requirements = parseJobDescription(req.body.description);

  const job = await JobPosting.findByIdAndUpdate(req.params.jobId, update, {
    new: true,
    runValidators: true,
  });

  if (!job) throw new ApiError(404, 'Job not found.');
  res.json({ success: true, data: { job } });
});

export const deleteJob = asyncHandler(async (req, res) => {
  const job = await JobPosting.findByIdAndDelete(req.params.jobId);
  if (!job) throw new ApiError(404, 'Job not found.');

  await Application.deleteMany({ job: job._id });
  res.json({ success: true, data: { message: 'Job deleted.' } });
});
