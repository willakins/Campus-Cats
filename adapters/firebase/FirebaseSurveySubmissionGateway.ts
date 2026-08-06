import { Functions, httpsCallable } from 'firebase/functions';

import { Survey, SurveyAnswer, User } from '../../core/domain';
import {
  SurveySubmissionGateway,
  SurveySubmissionError,
  SurveySubmissionResult,
} from '../../core/ports';

interface SubmitSurveyResponseResult {
  readonly responseId?: unknown;
  readonly submittedAtMillis?: unknown;
}

export class FirebaseSurveySubmissionGateway
  implements SurveySubmissionGateway
{
  constructor(private readonly functions: Functions) {}

  async submit(
    _actor: User,
    survey: Survey,
    answers: readonly SurveyAnswer[],
  ): Promise<SurveySubmissionResult> {
    let result;
    try {
      result = await httpsCallable<
        { readonly surveyId: string; readonly answers: readonly SurveyAnswer[] },
        SubmitSurveyResponseResult
      >(this.functions, 'submitSurveyResponse')({ surveyId: survey.id, answers });
    } catch (error) {
      const code = callableErrorCode(error);
      const message = callableErrorMessage(error);
      if (code === 'already-exists' || code === 'failed-precondition') {
        throw new SurveySubmissionError('conflict', message);
      }
      if (code === 'invalid-argument') {
        throw new SurveySubmissionError('validation', message);
      }
      throw error;
    }
    if (
      typeof result.data.responseId !== 'string' ||
      typeof result.data.submittedAtMillis !== 'number'
    ) {
      throw new Error('Survey submission did not return a valid receipt');
    }
    const submittedAt = new Date(result.data.submittedAtMillis);
    if (Number.isNaN(submittedAt.getTime())) {
      throw new Error('Survey submission returned an invalid date');
    }
    return { responseId: result.data.responseId, submittedAt };
  }
}

const callableErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = String(error.code);
  return code.startsWith('functions/') ? code.slice('functions/'.length) : code;
};

const callableErrorMessage = (error: unknown): string =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : 'Could not submit the survey response';
