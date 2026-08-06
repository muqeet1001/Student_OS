import { Profile } from '../models/Profile.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicUrlFor, removeUpload } from '../middleware/upload.js';

function serialize(profile) {
  return { ...profile.toJSON(), completeness: profile.completeness() };
}

export const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findOrCreateFor(req.user._id);
  res.json({
    success: true,
    data: { profile: serialize(profile), user: req.user.toJSON() },
  });
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findOrCreateFor(req.user._id);

  const { links, ...rest } = req.body;
  Object.assign(profile, rest);

  // `links` is a nested path, so merge field by field to keep any link the
  // client did not send.
  if (links) {
    for (const [key, value] of Object.entries(links)) {
      profile.links[key] = value;
    }
  }

  await profile.save();
  res.json({ success: true, data: { profile: serialize(profile) } });
});

export const updateMyAccount = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
    runValidators: true,
  });
  res.json({ success: true, data: { user: user.toJSON() } });
});

export const uploadMyAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image was uploaded');

  const user = await User.findById(req.user._id);
  const previous = user.avatarUrl;

  user.avatarUrl = publicUrlFor('avatars', req.file.filename);
  await user.save({ validateBeforeSave: false });

  // Only discard the old file once the new one is safely recorded.
  removeUpload(previous);

  res.json({ success: true, data: { user: user.toJSON() } });
});

/**
 * Builds the five near-identical CRUD handlers for the profile's array
 * sections. Keeping one implementation avoids drift between them.
 */
function sectionHandlers(section) {
  return {
    add: asyncHandler(async (req, res) => {
      const profile = await Profile.findOrCreateFor(req.user._id);
      profile[section].push(req.body);
      await profile.save();
      res.status(201).json({
        success: true,
        data: { profile: serialize(profile), item: profile[section].at(-1) },
      });
    }),

    update: asyncHandler(async (req, res) => {
      const profile = await Profile.findOrCreateFor(req.user._id);
      const item = profile[section].id(req.params.itemId);
      if (!item) throw ApiError.notFound(`That ${section.replace(/s$/, '')} does not exist`);

      item.set(req.body);
      await profile.save();
      res.json({ success: true, data: { profile: serialize(profile), item } });
    }),

    remove: asyncHandler(async (req, res) => {
      const profile = await Profile.findOrCreateFor(req.user._id);
      const item = profile[section].id(req.params.itemId);
      if (!item) throw ApiError.notFound(`That ${section.replace(/s$/, '')} does not exist`);

      if (section === 'certifications' && item.fileUrl) {
        removeUpload(item.fileUrl);
      }

      item.deleteOne();
      await profile.save();
      res.json({ success: true, data: { profile: serialize(profile) } });
    }),
  };
}

export const skills = sectionHandlers('skills');
export const projects = sectionHandlers('projects');
export const certifications = sectionHandlers('certifications');
export const education = sectionHandlers('education');
export const experience = sectionHandlers('experience');

export const uploadCertificateFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file was uploaded');

  const profile = await Profile.findOrCreateFor(req.user._id);
  const item = profile.certifications.id(req.params.itemId);
  if (!item) throw ApiError.notFound('That certification does not exist');

  const previous = item.fileUrl;
  item.fileUrl = publicUrlFor('certificates', req.file.filename);
  await profile.save();
  removeUpload(previous);

  res.json({ success: true, data: { profile: serialize(profile), item } });
});

/** Read-only view of another student's profile. */
export const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user || !user.isActive) throw ApiError.notFound('That student could not be found');

  const profile = await Profile.findOne({ user: user._id });
  if (!profile) throw ApiError.notFound('That student has not set up a profile yet');

  const { phone, ...publicFields } = profile.toJSON();

  res.json({
    success: true,
    data: {
      profile: publicFields,
      user: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl, headline: user.headline },
    },
  });
});
