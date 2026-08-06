import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const answerList = z
  .array(
    z.object({
      question: objectId,
      selectedOption: objectId.nullable().optional(),
    }),
  )
  .max(200);

export const saveAnswersSchema = z.object({
  answers: answerList,
});

export const submitAttemptSchema = z.object({
  answers: answerList.optional(),
});
