import { Survey, SurveyAnswer, User } from '../domain';

export interface SurveySubmissionResult {
  readonly responseId: string;
  readonly submittedAt: Date;
}

export type SurveySubmissionErrorCode = 'conflict' | 'validation';

export class SurveySubmissionError extends Error {
  constructor(
    readonly code: SurveySubmissionErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface SurveySubmissionGateway {
  submit(
    actor: User,
    survey: Survey,
    answers: readonly SurveyAnswer[],
  ): Promise<SurveySubmissionResult>;
}
