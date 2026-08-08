import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createOfferSchema = z.object({
  student: objectId,
  drive: objectId.optional(),
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(160),
  // Rupees per annum, so reports can aggregate without parsing free text.
  ctc: z.coerce.number().min(0).max(100_000_000).optional(),
  location: z.string().trim().max(160).optional(),
  status: z.enum(['offered', 'accepted', 'declined', 'joined', 'withdrawn']).default('offered'),
  joiningDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateOfferSchema = createOfferSchema.partial().omit({ student: true });
