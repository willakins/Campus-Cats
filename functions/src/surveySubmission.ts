import { randomUUID } from 'node:crypto';

import { HandlerError, ManagedUser } from './handlers';

export interface SurveyAnswerInput {
  readonly questionId: string;
  readonly value: string | readonly string[];
}

export interface SurveySubmissionResult {
  readonly responseId: string;
  readonly submittedAtMillis: number;
}

export interface SurveySubmissionDependencies {
  getUser(id: string): Promise<ManagedUser | undefined>;
  submit(input: {
    readonly actor: ManagedUser;
    readonly surveyId: string;
    readonly answers: readonly SurveyAnswerInput[];
    readonly responseId: string;
  }): Promise<SurveySubmissionResult>;
}

interface HandlerRequest {
  readonly authUid?: string;
  readonly data: {
    readonly surveyId?: unknown;
    readonly answers?: unknown;
  };
}

type StoredQuestion = Readonly<{
  id: string;
  type: 'single_choice' | 'multi_select' | 'short_text' | 'long_text';
  options: readonly Readonly<{ id: string }>[];
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
};

function parseAnswers(value: unknown): readonly SurveyAnswerInput[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) {
    throw new HandlerError('invalid-argument', 'Answer every survey question');
  }
  return value.map((answer) => {
    if (
      !isRecord(answer) ||
      !exactKeys(answer, ['questionId', 'value']) ||
      typeof answer.questionId !== 'string' ||
      !answer.questionId ||
      !(
        typeof answer.value === 'string' ||
        (Array.isArray(answer.value) &&
          answer.value.every((item) => typeof item === 'string'))
      )
    ) {
      throw new HandlerError('invalid-argument', 'Survey answers are invalid');
    }
    return {
      questionId: answer.questionId,
      value: answer.value as string | readonly string[],
    };
  });
}

function parseStoredQuestions(value: unknown): readonly StoredQuestion[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) {
    throw new HandlerError('internal', 'Stored survey questions are invalid');
  }
  const questions = value.map((question) => {
    if (
      !isRecord(question) ||
      typeof question.id !== 'string' ||
      !question.id ||
      (question.type !== 'single_choice' &&
        question.type !== 'multi_select' &&
        question.type !== 'short_text' &&
        question.type !== 'long_text') ||
      !Array.isArray(question.options)
    ) {
      throw new HandlerError('internal', 'Stored survey questions are invalid');
    }
    const type = question.type as StoredQuestion['type'];
    const options = question.options.map((option) => {
      if (!isRecord(option) || typeof option.id !== 'string' || !option.id) {
        throw new HandlerError('internal', 'Stored survey options are invalid');
      }
      return { id: option.id };
    });
    return { id: question.id, type, options };
  });
  if (new Set(questions.map(({ id }) => id)).size !== questions.length) {
    throw new HandlerError('internal', 'Stored survey question IDs are invalid');
  }
  return questions;
}

export function validateSurveyAnswers(
  surveyData: Record<string, unknown>,
  answers: readonly SurveyAnswerInput[],
): void {
  if (surveyData.status !== 'open') {
    throw new HandlerError('failed-precondition', 'This survey is closed');
  }
  if (typeof surveyData.anonymous !== 'boolean') {
    throw new HandlerError('internal', 'Stored survey privacy mode is invalid');
  }
  const questions = parseStoredQuestions(surveyData.questions);
  if (answers.length !== questions.length) {
    throw new HandlerError('invalid-argument', 'Answer every survey question');
  }
  const answersByQuestion = new Map(
    answers.map((answer) => [answer.questionId, answer]),
  );
  if (answersByQuestion.size !== questions.length) {
    throw new HandlerError('invalid-argument', 'Answer every survey question once');
  }

  for (const question of questions) {
    const answer = answersByQuestion.get(question.id);
    if (!answer) {
      throw new HandlerError('invalid-argument', 'Answer every survey question');
    }
    const optionIds = new Set(question.options.map(({ id }) => id));
    if (
      question.type === 'single_choice' &&
      (typeof answer.value !== 'string' || !optionIds.has(answer.value))
    ) {
      throw new HandlerError('invalid-argument', 'Choose one valid option');
    }
    if (question.type === 'multi_select') {
      if (
        !Array.isArray(answer.value) ||
        answer.value.length === 0 ||
        answer.value.length > 20 ||
        new Set(answer.value).size !== answer.value.length ||
        answer.value.some((value) => !optionIds.has(value))
      ) {
        throw new HandlerError('invalid-argument', 'Choose valid select-all options');
      }
    }
    if (question.type === 'short_text') {
      if (
        typeof answer.value !== 'string' ||
        !answer.value.trim() ||
        answer.value.length > 500
      ) {
        throw new HandlerError('invalid-argument', 'Enter a valid short answer');
      }
    }
    if (question.type === 'long_text') {
      if (
        typeof answer.value !== 'string' ||
        !answer.value.trim() ||
        answer.value.length > 5000
      ) {
        throw new HandlerError('invalid-argument', 'Enter a valid long answer');
      }
    }
  }
}

export async function handleSubmitSurveyResponse(
  request: HandlerRequest,
  dependencies: SurveySubmissionDependencies,
): Promise<SurveySubmissionResult> {
  if (!request.authUid) {
    throw new HandlerError('unauthenticated', 'Sign in to answer surveys');
  }
  const actor = await dependencies.getUser(request.authUid);
  if (!actor || actor.banned) {
    throw new HandlerError('permission-denied', 'Your account cannot answer surveys');
  }
  if (
    typeof request.data.surveyId !== 'string' ||
    !request.data.surveyId ||
    request.data.surveyId.length > 200 ||
    !/^[A-Za-z0-9_-]+$/.test(request.data.surveyId)
  ) {
    throw new HandlerError('invalid-argument', 'Survey ID is invalid');
  }
  const answers = parseAnswers(request.data.answers);
  return dependencies.submit({
    actor,
    surveyId: request.data.surveyId,
    answers,
    responseId: randomUUID(),
  });
}
