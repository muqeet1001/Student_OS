import { Problem } from '../models/Problem.js';
import { Profile } from '../models/Profile.js';
import { Test } from '../models/Test.js';
import {
  LEVELS,
  stageFocus,
  stageForSemester,
  subjectSlugs,
  suggestSemester,
} from '../config/courseTaxonomy.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** How many academic years ahead a graduation year may be to still count. */
function plausibleFallback(graduationYear, now = new Date()) {
  if (!graduationYear) return false;
  const year = now.getFullYear();
  // Enrolled today means graduating within roughly the next 1-4 years; a
  // graduation year far in the past means an alumnus, whose semester is gone.
  return graduationYear >= year - 3 && graduationYear <= year + 4;
}

/**
 * The semester-aware practice track.
 *
 * Returns which stage of the placement journey the student's current semester
 * puts them in, the subjects to focus on (with the level to aim at), and how
 * much matching practice content exists. The semester *recommends*: it never
 * hides content — the full catalogue stays reachable through the hub filters.
 */
export const getTrack = asyncHandler(async (req, res) => {
  const profile = await Profile.findOrCreateFor(req.user._id);

  const now = new Date();
  let semester = profile.semester ?? null;
  let source = semester ? 'profile' : null;

  // A student who never stated a semester still gets a sensible default from
  // their graduation year — but only while they are plausibly enrolled.
  if (!semester && plausibleFallback(profile.graduationYear, now)) {
    semester = suggestSemester(profile.graduationYear, now);
    if (semester) source = 'suggested';
  }

  const stage = stageForSemester(semester);
  const focus = stageFocus(stage);

  const counts = await Promise.all(
    focus.map(async (entry) => {
      const slugs = subjectSlugs(entry.subjectId);
      const level = LEVELS[entry.level];

      const tests = slugs.length
        ? await Test.countDocuments({ isPublished: true, slug: { $in: slugs } })
        : 0;

      // Coding problems live under the DSA subject only; difficulty is the
      // level axis for them. Counting difficulty-matched problems for every
      // subject would inflate non-DSA rows with irrelevant numbers.
      const problems =
        entry.subjectId === 'dsa'
          ? await Problem.countDocuments({
              isPublished: true,
              difficulty: { $in: level.problemDifficulties },
            })
          : 0;

      return {
        subjectId: entry.subjectId,
        subjectLabel: entry.subjectLabel,
        domain: entry.domain,
        domainLabel: entry.domainLabel,
        level: entry.level,
        levelLabel: entry.levelLabel,
        tests,
        problems,
        // CS-core subjects with timed MCQ papers live in the test library;
        // DSA additionally points at the coding problem set.
        to: entry.subjectId === 'dsa' ? '/coding-practice' : '/skill-test',
      };
    }),
  );

  res.json({
    success: true,
    data: {
      semester,
      semesterSource: source,
      stage: stage
        ? {
            id: stage.id,
            label: stage.label,
            description: stage.description,
            semesters: stage.semesters,
          }
        : null,
      focus,
      countBySubject: counts,
    },
  });
});
