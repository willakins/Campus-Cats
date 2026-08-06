import {
  COLLECTIONS,
  Clock,
  FirestoreCodec,
  IdGenerator,
  Outcome,
  Survey,
  SurveyAnswer,
  SurveyQuestion,
  SurveyQuestionType,
  SurveyResponse,
  User,
  canManageFeature,
  failure,
  parseSurvey,
  parseSurveyResponse,
  success,
  surveyReceiptId,
} from '../../core/domain';
import {
  DocumentStore,
  SurveySubmissionError,
  SurveySubmissionGateway,
} from '../../core/ports';

export interface SurveyQuestionDraft {
  readonly type: SurveyQuestionType;
  readonly prompt: string;
  readonly options: readonly string[];
}

export interface SurveyDraft {
  readonly title: string;
  readonly details: string;
  readonly anonymous: boolean;
  readonly questions: readonly SurveyQuestionDraft[];
}

interface SurveysDependencies {
  readonly documents: DocumentStore;
  readonly submission: SurveySubmissionGateway;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly codecs: {
    readonly survey: FirestoreCodec<Survey>;
    readonly surveyResponse: FirestoreCodec<SurveyResponse>;
  };
}

export class SurveysModule {
  constructor(private readonly dependencies: SurveysDependencies) {}

  async list(actor: User | undefined): Promise<Outcome<readonly Survey[]>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view surveys');
    try {
      const documents = await this.dependencies.documents.list(COLLECTIONS.surveys);
      let invalidCount = 0;
      const surveys = documents
        .flatMap(({ id, data }) => {
          try {
            return [this.dependencies.codecs.survey.decode(id, data)];
          } catch {
            invalidCount += 1;
            return [];
          }
        })
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
      return success(
        surveys,
        invalidCount
          ? [
              {
                code: 'partial_completion',
                message: `${invalidCount} invalid ${invalidCount === 1 ? 'survey was' : 'surveys were'} excluded.`,
              },
            ]
          : [],
      );
    } catch {
      return failure('dependency_failure', 'Could not load surveys');
    }
  }

  async get(actor: User | undefined, id: string): Promise<Outcome<Survey>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view surveys');
    try {
      const document = await this.dependencies.documents.get(COLLECTIONS.surveys, id);
      return document
        ? success(this.dependencies.codecs.survey.decode(document.id, document.data))
        : failure('not_found', 'Survey not found');
    } catch {
      return failure('dependency_failure', 'Could not load the survey');
    }
  }

  async create(
    actor: User | undefined,
    draft: SurveyDraft,
  ): Promise<Outcome<Survey>> {
    const denied = managementDenied(actor);
    if (denied) return denied;
    const validation = validateSurveyDraft(draft);
    if (validation) return failure('validation', validation);

    try {
      const survey = parseSurvey({
        id: this.dependencies.ids.next(),
        title: draft.title,
        details: draft.details,
        anonymous: draft.anonymous,
        status: 'open',
        questions: draft.questions.map((question) => ({
          id: this.dependencies.ids.next(),
          type: question.type,
          prompt: question.prompt,
          options: isChoiceQuestion(question.type)
            ? question.options.map((label) => ({
                id: this.dependencies.ids.next(),
                label,
              }))
            : [],
        })),
        createdAt: this.dependencies.clock.now(),
        createdBy: actor,
      });
      await this.dependencies.documents.put(
        COLLECTIONS.surveys,
        survey.id,
        this.dependencies.codecs.survey.encode(survey),
      );
      return success(survey);
    } catch {
      return failure('dependency_failure', 'Could not create the survey');
    }
  }

  async close(
    actor: User | undefined,
    surveyId: string,
  ): Promise<Outcome<Survey>> {
    const denied = managementDenied(actor);
    if (denied) return denied;
    const existing = await this.get(actor, surveyId);
    if (!existing.ok) return existing;
    if (existing.value.status === 'closed') {
      return failure('conflict', 'This survey is already closed');
    }
    const survey = parseSurvey({
      ...existing.value,
      status: 'closed',
      closedAt: this.dependencies.clock.now(),
    });
    try {
      await this.dependencies.documents.put(
        COLLECTIONS.surveys,
        survey.id,
        this.dependencies.codecs.survey.encode(survey),
      );
      return success(survey);
    } catch {
      return failure('dependency_failure', 'Could not close the survey');
    }
  }

  async hasSubmitted(
    actor: User | undefined,
    surveyId: string,
  ): Promise<Outcome<boolean>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view your submission');
    try {
      const receipt = await this.dependencies.documents.get(
        COLLECTIONS.surveySubmissionReceipts,
        surveyReceiptId(surveyId, actor.id),
      );
      return success(Boolean(receipt));
    } catch {
      return failure('dependency_failure', 'Could not check your survey submission');
    }
  }

  async submit(
    actor: User | undefined,
    surveyId: string,
    answers: readonly SurveyAnswer[],
  ): Promise<Outcome<SurveyResponse>> {
    if (!actor) return failure('unauthenticated', 'Sign in to answer surveys');
    const surveyResult = await this.get(actor, surveyId);
    if (!surveyResult.ok) return surveyResult;
    if (surveyResult.value.status !== 'open') {
      return failure('conflict', 'This survey is closed');
    }

    const submitted = await this.hasSubmitted(actor, surveyId);
    if (!submitted.ok) return submitted;
    if (submitted.value) {
      return failure('conflict', 'You already submitted this survey');
    }
    const validation = validateAnswers(surveyResult.value.questions, answers);
    if (validation) return failure('validation', validation);

    try {
      const submission = await this.dependencies.submission.submit(
        actor,
        surveyResult.value,
        answers,
      );
      const response = parseSurveyResponse({
        id: submission.responseId,
        surveyId,
        answers,
        submittedAt: submission.submittedAt,
        respondent: surveyResult.value.anonymous ? undefined : actor,
      });
      return success(response);
    } catch (error) {
      if (error instanceof SurveySubmissionError) {
        return failure(error.code, error.message);
      }
      return failure('dependency_failure', 'Could not submit the survey response');
    }
  }

  async responses(
    actor: User | undefined,
    surveyId: string,
  ): Promise<Outcome<readonly SurveyResponse[]>> {
    const denied = managementDenied(actor);
    if (denied) return denied;
    try {
      const documents = await this.dependencies.documents.listWhereEqual(
        COLLECTIONS.surveyResponses,
        'surveyId',
        surveyId,
      );
      let invalidCount = 0;
      const responses = documents
        .flatMap(({ id, data }) => {
          try {
            return [this.dependencies.codecs.surveyResponse.decode(id, data)];
          } catch {
            invalidCount += 1;
            return [];
          }
        })
        .sort(
          (left, right) =>
            right.submittedAt.getTime() - left.submittedAt.getTime(),
        );
      return success(
        responses,
        invalidCount
          ? [
              {
                code: 'partial_completion',
                message: `${invalidCount} invalid survey ${invalidCount === 1 ? 'response was' : 'responses were'} excluded.`,
              },
            ]
          : [],
      );
    } catch {
      return failure('dependency_failure', 'Could not load survey responses');
    }
  }
}

function managementDenied(actor: User | undefined): Outcome<never> | undefined {
  if (!actor) return failure('unauthenticated', 'Sign in to manage surveys');
  if (!canManageFeature(actor.role)) {
    return failure('forbidden', 'Only officers may manage surveys');
  }
  return undefined;
}

function isChoiceQuestion(type: SurveyQuestionType): boolean {
  return type === 'single_choice' || type === 'multi_select';
}

function validateSurveyDraft(draft: SurveyDraft): string | undefined {
  if (!draft.title.trim()) return 'Survey title cannot be empty.';
  if (draft.title.trim().length > 120) {
    return 'Survey title must be 120 characters or fewer.';
  }
  if (draft.details.trim().length > 5000) {
    return 'Survey details must be 5,000 characters or fewer.';
  }
  if (draft.questions.length === 0) return 'Add at least one survey question.';
  if (draft.questions.length > 40) return 'Surveys may have up to 40 questions.';
  for (const question of draft.questions) {
    if (!question.prompt.trim()) return 'Every survey question needs a prompt.';
    if (question.prompt.trim().length > 500) {
      return 'Survey questions must be 500 characters or fewer.';
    }
    if (isChoiceQuestion(question.type)) {
      const options = question.options.map((option) => option.trim()).filter(Boolean);
      if (question.options.some((option) => !option.trim())) {
        return 'Choice question options cannot be empty.';
      }
      if (options.length < 2) return 'Choice questions need at least two options.';
      if (options.length > 20) return 'Choice questions may have up to 20 options.';
      if (options.some((option) => option.length > 300)) {
        return 'Choice question options must be 300 characters or fewer.';
      }
      if (new Set(options.map((option) => option.toLocaleLowerCase())).size !== options.length) {
        return 'Choice question options must be unique.';
      }
    } else if (question.options.length > 0) {
      return 'Text questions cannot have answer options.';
    }
  }
  return undefined;
}

function validateAnswers(
  questions: readonly SurveyQuestion[],
  answers: readonly SurveyAnswer[],
): string | undefined {
  if (answers.length !== questions.length) return 'Answer every survey question.';
  const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  if (byQuestion.size !== questions.length) return 'Answer every survey question once.';

  for (const question of questions) {
    const answer = byQuestion.get(question.id);
    if (!answer) return 'Answer every survey question.';
    const optionIds = new Set<string>(question.options.map(({ id }) => id));
    if (question.type === 'single_choice') {
      if (typeof answer.value !== 'string' || !optionIds.has(answer.value)) {
        return 'Choose one valid option for every multiple-choice question.';
      }
    } else if (question.type === 'multi_select') {
      if (
        !Array.isArray(answer.value) ||
        answer.value.length === 0 ||
        new Set(answer.value).size !== answer.value.length ||
        answer.value.some((value) => !optionIds.has(value))
      ) {
        return 'Choose at least one valid option for every select-all question.';
      }
    } else if (typeof answer.value !== 'string' || !answer.value.trim()) {
      return 'Answer every text question.';
    } else if (question.type === 'short_text' && answer.value.length > 500) {
      return 'Short answers must be 500 characters or fewer.';
    } else if (question.type === 'long_text' && answer.value.length > 5000) {
      return 'Long answers must be 5,000 characters or fewer.';
    }
  }
  return undefined;
}
