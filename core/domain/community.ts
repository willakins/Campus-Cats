import { z } from 'zod';

import {
  clubEventIdSchema,
  surveyIdSchema,
  surveyOptionIdSchema,
  surveyQuestionIdSchema,
  surveyResponseIdSchema,
  userIdSchema,
} from './ids';
import { userSchema } from './models';

const requiredText = z.string().trim().min(1);
const validDate = z.date().refine((date) => !Number.isNaN(date.getTime()), {
  message: 'Expected a valid date',
});

export const clubEventSchema = z.object({
  id: clubEventIdSchema,
  title: requiredText.max(120),
  details: requiredText.max(5000),
  location: requiredText.max(300),
  startsAt: validDate,
  expiresAt: validDate,
  imageUrl: z.string().url().max(2048),
  createdAt: validDate,
  createdBy: userSchema,
});

export const surveyQuestionTypeSchema = z.enum([
  'single_choice',
  'multi_select',
  'short_text',
  'long_text',
]);

export const surveyOptionSchema = z.object({
  id: surveyOptionIdSchema,
  label: requiredText.max(300),
});

export const surveyQuestionSchema = z
  .object({
    id: surveyQuestionIdSchema,
    type: surveyQuestionTypeSchema,
    prompt: requiredText.max(500),
    options: z.array(surveyOptionSchema).max(20),
  })
  .superRefine((question, context) => {
    const isChoice =
      question.type === 'single_choice' || question.type === 'multi_select';
    if (isChoice && question.options.length < 2) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Choice questions need at least two options',
      });
    }
    if (!isChoice && question.options.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Text questions cannot have options',
      });
    }
    if (new Set(question.options.map(({ id }) => id)).size !== question.options.length) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Option IDs must be unique',
      });
    }
  });

export const surveySchema = z
  .object({
    id: surveyIdSchema,
    title: requiredText.max(120),
    details: z.string().trim().max(5000),
    anonymous: z.boolean(),
    status: z.enum(['open', 'closed']),
    questions: z.array(surveyQuestionSchema).min(1).max(40),
    createdAt: validDate,
    createdBy: userSchema,
    closedAt: validDate.optional(),
  })
  .superRefine((survey, context) => {
    if (new Set(survey.questions.map(({ id }) => id)).size !== survey.questions.length) {
      context.addIssue({
        code: 'custom',
        path: ['questions'],
        message: 'Question IDs must be unique',
      });
    }
    if (survey.status === 'open' && survey.closedAt) {
      context.addIssue({
        code: 'custom',
        path: ['closedAt'],
        message: 'Open surveys cannot have a closed date',
      });
    }
    if (survey.status === 'closed' && !survey.closedAt) {
      context.addIssue({
        code: 'custom',
        path: ['closedAt'],
        message: 'Closed surveys require a closed date',
      });
    }
  });

export const surveyAnswerSchema = z.object({
  questionId: surveyQuestionIdSchema,
  value: z.union([
    z.string().max(5000),
    z.array(surveyOptionIdSchema).max(20),
  ]),
});

export const surveyResponseSchema = z.object({
  id: surveyResponseIdSchema,
  surveyId: surveyIdSchema,
  answers: z.array(surveyAnswerSchema).min(1).max(40),
  submittedAt: validDate,
  respondent: userSchema.optional(),
});

export const surveySubmissionReceiptSchema = z.object({
  surveyId: surveyIdSchema,
  responseId: surveyResponseIdSchema,
  userId: userIdSchema,
  submittedAt: validDate,
});

export type ClubEvent = Readonly<z.infer<typeof clubEventSchema>>;
export type SurveyQuestionType = z.infer<typeof surveyQuestionTypeSchema>;
export type SurveyOption = Readonly<z.infer<typeof surveyOptionSchema>>;
export type SurveyQuestion = Readonly<z.infer<typeof surveyQuestionSchema>>;
export type Survey = Readonly<z.infer<typeof surveySchema>>;
export type SurveyAnswer = Readonly<z.infer<typeof surveyAnswerSchema>>;
export type SurveyResponse = Readonly<z.infer<typeof surveyResponseSchema>>;
export type SurveySubmissionReceipt = Readonly<
  z.infer<typeof surveySubmissionReceiptSchema>
>;

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export const parseClubEvent = (value: unknown): ClubEvent =>
  deepFreeze(clubEventSchema.parse(value));
export const parseSurvey = (value: unknown): Survey =>
  deepFreeze(surveySchema.parse(value));
export const parseSurveyResponse = (value: unknown): SurveyResponse =>
  deepFreeze(surveyResponseSchema.parse(value));
export const parseSurveySubmissionReceipt = (
  value: unknown,
): SurveySubmissionReceipt =>
  deepFreeze(surveySubmissionReceiptSchema.parse(value));

export const surveyReceiptId = (surveyId: string, userId: string): string =>
  `${userId}__${surveyId}`;

export const isExpiredEvent = (event: ClubEvent, now: Date): boolean =>
  event.expiresAt.getTime() <= now.getTime();
