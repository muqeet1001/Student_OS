import { ReviewRequest } from '../models/ReviewRequest.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Profile } from '../models/Profile.js';

export const listMine = asyncHandler(async (req, res) => {
  const reviews = await ReviewRequest.find({ student: req.user._id })
    .populate('reviewer', 'name')
    .populate('messages.author', 'name role')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: { reviews } });
});

export const requestReview = asyncHandler(async (req, res) => {
  const duplicate = await ReviewRequest.findOne({
    student: req.user._id,
    kind: req.body.kind,
    resourceId: req.body.resourceId,
    status: 'requested',
  });
  if (duplicate) throw ApiError.conflict('A review of this item is already waiting for staff.');
  let review;
  try {
    review = await ReviewRequest.create({ student: req.user._id, ...req.body });
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict('A review of this item is already waiting for staff.');
    }
    throw error;
  }
  res.status(201).json({ success: true, data: { review } });
});

export const listQueue = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.graduationYear) {
    const profiles = await Profile.find({ graduationYear: Number(req.query.graduationYear) }).select('user').lean();
    filter.student = { $in: profiles.map((profile) => profile.user) };
  }
  const reviews = await ReviewRequest.find(filter)
    .populate('student', 'name email')
    .populate('reviewer', 'name')
    .sort({ status: 1, createdAt: 1 })
    .limit(200)
    .lean();
  res.json({ success: true, data: { reviews } });
});

export const completeReview = asyncHandler(async (req, res) => {
  const review = await ReviewRequest.findByIdAndUpdate(req.params.reviewId, {
    status: 'reviewed',
    feedback: req.body.feedback,
    reviewer: req.user._id,
    reviewedAt: new Date(),
  }, { new: true, runValidators: true }).populate('student', 'name email');
  if (!review) throw ApiError.notFound('Review request not found.');
  res.json({ success: true, data: { review } });
});

export const addMessage = asyncHandler(async (req, res) => {
  const review = await ReviewRequest.findById(req.params.reviewId);
  if (!review) throw ApiError.notFound('Review request not found.');
  if (req.user.role !== 'admin' && String(review.student) !== String(req.user._id)) {
    throw ApiError.notFound('Review request not found.');
  }
  review.messages.push({ author: req.user._id, body: req.body.body });
  await review.save();
  await review.populate('messages.author', 'name role');
  res.status(201).json({ success: true, data: { review } });
});
