import { Profile } from '../models/Profile.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  deleteFile,
  getFileInfo,
  openDownloadStream,
  safeFilename,
  storeFile,
} from '../services/fileStore.js';

const ASSET_URL = /^\/api\/profile\/assets\/([a-f\d]{24})(?:\/download)?$/i;

function assetIdFromUrl(url) {
  return String(url || '').match(ASSET_URL)?.[1] ?? null;
}

async function removeAsset(url) {
  const id = assetIdFromUrl(url);
  return id ? deleteFile(id) : false;
}

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

  const { links, publicProfile, ...rest } = req.body;
  Object.assign(profile, rest);

  // `links` is a nested path, so merge field by field to keep any link the
  // client did not send.
  if (links) {
    for (const [key, value] of Object.entries(links)) {
      profile.links[key] = value;
    }
  }

  if (publicProfile) {
    for (const [key, value] of Object.entries(publicProfile)) {
      profile.publicProfile[key] = value;
    }
    if (!profile.publicProfile.enabled) profile.publicProfile.openToReferrals = false;
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

  const stored = await storeFile({
    buffer: req.file.buffer,
    filename: req.file.safeName,
    contentType: req.file.detectedMime,
    metadata: { owner: String(user._id), purpose: 'avatar' },
  });

  user.avatarUrl = `/api/profile/assets/${stored.fileId}`;
  try {
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    await deleteFile(stored.fileId);
    throw error;
  }

  // Only discard the old file once the new one is safely recorded.
  await removeAsset(previous);

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

      const removedAsset = section === 'certifications' ? item.fileUrl : null;

      item.deleteOne();
      await profile.save();
      await removeAsset(removedAsset);
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
  const stored = await storeFile({
    buffer: req.file.buffer,
    filename: req.file.safeName,
    contentType: req.file.detectedMime,
    metadata: { owner: String(req.user._id), purpose: 'certificate' },
  });

  item.fileUrl = `/api/profile/assets/${stored.fileId}/download`;
  try {
    await profile.save();
  } catch (error) {
    await deleteFile(stored.fileId);
    throw error;
  }
  await removeAsset(previous);

  res.json({ success: true, data: { profile: serialize(profile), item } });
});

async function streamProfileAsset(req, res, { purpose, disposition, cacheControl }) {
  const info = await getFileInfo(req.params.assetId);
  if (!info || info.metadata?.purpose !== purpose) {
    throw ApiError.notFound('Asset not found');
  }

  if (purpose === 'avatar' && !String(info.contentType).startsWith('image/')) {
    throw ApiError.notFound('Asset not found');
  }

  if (
    purpose === 'certificate' &&
    req.user.role !== 'admin' &&
    String(info.metadata.owner) !== String(req.user._id)
  ) {
    throw ApiError.notFound('Asset not found');
  }

  res.setHeader('Content-Type', info.contentType);
  res.setHeader('Content-Length', info.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${safeFilename(info.filename)}"`,
  );

  const stream = openDownloadStream(info._id);
  stream.on('error', () => (res.headersSent ? res.destroy() : res.status(404).end()));
  stream.pipe(res);
}

/** Avatars are public, but only validated image bytes can reach this route. */
export const getAvatarAsset = asyncHandler((req, res) =>
  streamProfileAsset(req, res, {
    purpose: 'avatar',
    disposition: 'inline',
    cacheControl: 'public, max-age=604800, immutable',
  }),
);

/** Certificate evidence is private to its owner and placement-office staff. */
export const downloadCertificateAsset = asyncHandler((req, res) =>
  streamProfileAsset(req, res, {
    purpose: 'certificate',
    disposition: 'attachment',
    cacheControl: 'private, no-store',
  }),
);

/** Read-only view of another student's profile. */
export const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user || !user.isActive) throw ApiError.notFound('That student could not be found');

  const profile = await Profile.findOne({ user: user._id });
  if (!profile || !profile.publicProfile?.enabled) {
    throw ApiError.notFound('That student does not have a public profile');
  }

  const publicFields = profile.toJSON();
  delete publicFields.phone;

  res.json({
    success: true,
    data: {
      profile: publicFields,
      user: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl, headline: user.headline },
    },
  });
});
