import { asyncHandler } from '../utils/asyncHandler.js';
import { loadCohort } from '../services/cohort.service.js';
import { parseJobDescription, rankStudents } from '../services/jobMatch.js';

/**
 * Ranks the cohort against a pasted job description.
 *
 * Nothing is stored: a placement officer pastes a JD, gets a shortlist, and
 * moves on. Keeping it stateless also means no accidental archive of every
 * role a college ever considered.
 */
export const matchStudents = asyncHandler(async (req, res) => {
  const { description, limit = 20, branch = '', graduationYear = '' } = req.body;

  const requirements = parseJobDescription(description);
  const cohort = await loadCohort({ branch, graduationYear });
  const ranked = rankStudents(cohort, requirements, { limit });

  res.json({
    success: true,
    data: {
      requirements,
      // Surfaced so the officer can see what the parser understood, and
      // correct the JD if a skill was written in a way we do not know.
      parsedSkillCount: requirements.skills.length,
      totalConsidered: cohort.length,
      students: ranked.map((student) => ({
        _id: student._id,
        name: student.name,
        email: student.email,
        branch: student.branch,
        graduationYear: student.graduationYear,
        headline: student.headline,
        readiness: student.readiness,
        band: student.band,
        solved: student.solved,
        testAverage: student.testAverage,
        interviewAverage: student.interviewAverage,
        match: student.match,
      })),
    },
  });
});

/**
 * The same engine from the student's side: how well do I fit this role, and
 * what exactly am I missing?
 */
export const matchMe = asyncHandler(async (req, res) => {
  const { description } = req.body;

  const requirements = parseJobDescription(description);
  const [me] = await loadCohort({ search: req.user.email });

  if (!me) {
    return res.json({ success: true, data: { requirements, match: null } });
  }

  const [ranked] = rankStudents([me], requirements, { limit: 1 });

  return res.json({
    success: true,
    data: {
      requirements,
      match: ranked.match,
      readiness: me.readiness,
    },
  });
});
