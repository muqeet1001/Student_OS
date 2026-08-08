import { Announcement } from '../models/Announcement.js';
import { Drive } from '../models/Drive.js';
import { loadCohort } from '../services/cohort.service.js';
import { AUDIENCE_TYPES, describeAudience, resolveAudience } from '../services/audience.js';
import { mailerStatus, sendBulkEmail, summariseDelivery } from '../services/mailer.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Loads the cohort and the drive shortlist an audience might need. */
async function poolsFor(audience) {
  const cohort = await loadCohort({});

  let driveShortlist = null;
  if (audience.type === 'drive' && audience.drive) {
    const drive = await Drive.findById(audience.drive).select('shortlist').lean();
    // Left as null when the drive is missing, so resolveAudience fails
    // closed rather than falling through to everybody.
    if (drive) driveShortlist = drive.shortlist.map((entry) => entry.student);
  }

  return { cohort, driveShortlist };
}

/**
 * Counts the audience without sending anything.
 *
 * A separate step on purpose: the officer sees who this is about to reach
 * before it becomes irreversible.
 */
export const previewAudience = asyncHandler(async (req, res) => {
  const audience = req.body;
  const { recipients, reason } = resolveAudience(audience, await poolsFor(audience));

  res.json({
    success: true,
    data: {
      count: recipients.length,
      description: describeAudience(audience),
      reason,
      sample: recipients.slice(0, 5).map((student) => ({ name: student.name, email: student.email })),
      email: mailerStatus(),
    },
  });
});

export const sendAnnouncement = asyncHandler(async (req, res) => {
  const { subject, body, audience } = req.body;

  const { recipients, reason } = resolveAudience(audience, await poolsFor(audience));

  // Refused rather than recorded as an announcement that reached nobody:
  // an empty send is almost always a mis-built filter, and silently
  // accepting it teaches the officer to trust a broken one.
  if (recipients.length === 0) {
    throw new ApiError(400, reason ?? 'That audience matches no students.');
  }

  const status = mailerStatus();

  const results = await sendBulkEmail({
    recipients,
    subject,
    text: body,
    // Escaped, because the body is free text typed by staff and would
    // otherwise be able to inject markup into every student's mail client.
    html: `<p>${body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')}</p>`,
  });

  const byEmail = new Map(results.map((result) => [result.email, result]));

  const announcement = await Announcement.create({
    subject,
    body,
    audience: { ...audience, description: describeAudience(audience) },
    recipients: recipients.map((student) => ({
      student: student._id,
      email: student.email,
      delivery: byEmail.get(student.email)?.status ?? 'skipped',
      error: byEmail.get(student.email)?.error ?? '',
    })),
    emailAvailable: status.available,
    emailNote: status.reason ?? '',
    sentBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: {
      announcement,
      delivery: summariseDelivery(results),
      email: status,
    },
  });
});

/** Everything the office has sent. */
export const listAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({})
    .select('-recipients.error')
    .populate('sentBy', 'name')
    .sort({ sentAt: -1 })
    .limit(100)
    .lean({ virtuals: true });

  res.json({
    success: true,
    data: { announcements, audienceTypes: AUDIENCE_TYPES, email: mailerStatus() },
  });
});

/**
 * A student's inbox.
 *
 * Read from the frozen recipient list, so a student who has since changed
 * branch still sees what they were actually sent.
 */
export const myAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({ 'recipients.student': req.user._id })
    .select('subject body sentAt sentBy recipients.$')
    .populate('sentBy', 'name')
    .sort({ sentAt: -1 })
    .limit(50)
    .lean();

  const inbox = announcements.map((announcement) => ({
    _id: announcement._id,
    subject: announcement.subject,
    body: announcement.body,
    sentAt: announcement.sentAt,
    from: announcement.sentBy?.name ?? 'Placement office',
    readAt: announcement.recipients?.[0]?.readAt ?? null,
  }));

  res.json({
    success: true,
    data: { announcements: inbox, unread: inbox.filter((entry) => !entry.readAt).length },
  });
});

export const markRead = asyncHandler(async (req, res) => {
  const result = await Announcement.updateOne(
    { _id: req.params.announcementId, 'recipients.student': req.user._id },
    { $set: { 'recipients.$.readAt': new Date() } },
  );

  if (result.matchedCount === 0) throw new ApiError(404, 'Announcement not found.');

  res.json({ success: true, data: { message: 'Marked as read.' } });
});
