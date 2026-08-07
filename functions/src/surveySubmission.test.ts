import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HandlerError, ManagedUser } from './handlers';
import {
  SurveyAnswerInput,
  SurveySubmissionDependencies,
  handleSubmitSurveyResponse,
  validateSurveyAnswers,
} from './surveySubmission';

const member: ManagedUser = {
  id: 'member-1',
  email: 'member@gatech.edu',
  role: 0,
  clubId: 'campus-cats',
  banned: false,
};

const storedSurvey = {
  status: 'open',
  anonymous: true,
  questions: [
    {
      id: 'single',
      type: 'single_choice',
      prompt: 'Choose one',
      options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    },
    {
      id: 'multi',
      type: 'multi_select',
      prompt: 'Choose all',
      options: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }],
    },
    { id: 'short', type: 'short_text', prompt: 'Short', options: [] },
    { id: 'long', type: 'long_text', prompt: 'Long', options: [] },
  ],
};

const validAnswers = (): SurveyAnswerInput[] => [
  { questionId: 'single', value: 'a' },
  { questionId: 'multi', value: ['x', 'y'] },
  { questionId: 'short', value: 'Short response' },
  { questionId: 'long', value: 'Long response' },
];

const rejectsWithCode = async (
  operation: () => Promise<unknown> | unknown,
  code: HandlerError['code'],
) => {
  await assert.rejects(
    async () => operation(),
    (error: unknown) => error instanceof HandlerError && error.code === code,
  );
};

function buildDependencies(
  user: ManagedUser | undefined = member,
): SurveySubmissionDependencies & { readonly submissions: unknown[] } {
  const submissions: unknown[] = [];
  return {
    submissions,
    async getUser() {
      return user;
    },
    async submit(input) {
      submissions.push(input);
      return { responseId: input.responseId, submittedAtMillis: 1786017600000 };
    },
  };
}

describe('survey submission callable', () => {
  it('requires an active account and a canonical request', async () => {
    const dependencies = buildDependencies();
    await rejectsWithCode(
      () =>
        handleSubmitSurveyResponse(
          { data: { surveyId: 'survey-1', answers: validAnswers() } },
          dependencies,
        ),
      'unauthenticated',
    );
    await rejectsWithCode(
      () =>
        handleSubmitSurveyResponse(
          {
            authUid: 'banned-1',
            data: { surveyId: 'survey-1', answers: validAnswers() },
          },
          buildDependencies({ ...member, banned: true }),
        ),
      'permission-denied',
    );
    for (const data of [
      { surveyId: '../survey', answers: validAnswers() },
      { surveyId: 'survey-1', answers: [] },
      {
        surveyId: 'survey-1',
        answers: [{ questionId: 'short', value: 'Answer', extra: true }],
      },
    ]) {
      await rejectsWithCode(
        () =>
          handleSubmitSurveyResponse(
            { authUid: member.id, data },
            dependencies,
          ),
        'invalid-argument',
      );
    }
  });

  it('derives identity from authentication and delegates a generated response ID', async () => {
    const dependencies = buildDependencies();
    const result = await handleSubmitSurveyResponse(
      {
        authUid: member.id,
        data: { surveyId: 'survey-1', answers: validAnswers() },
      },
      dependencies,
    );

    assert.equal(typeof result.responseId, 'string');
    assert.equal(result.submittedAtMillis, 1786017600000);
    assert.deepEqual(dependencies.submissions, [
      {
        actor: member,
        surveyId: 'survey-1',
        answers: validAnswers(),
        responseId: result.responseId,
      },
    ]);
  });

  it('validates every answer against the stored survey definition', async () => {
    assert.doesNotThrow(() => validateSurveyAnswers(storedSurvey, validAnswers()));
    const invalidCases: readonly [Record<string, unknown>, SurveyAnswerInput[]][] = [
      [{ ...storedSurvey, status: 'closed' }, validAnswers()],
      [storedSurvey, validAnswers().slice(0, 3)],
      [
        storedSurvey,
        validAnswers().map((answer) =>
          answer.questionId === 'single' ? { ...answer, value: 'unknown' } : answer,
        ),
      ],
      [
        storedSurvey,
        validAnswers().map((answer) =>
          answer.questionId === 'multi' ? { ...answer, value: [] } : answer,
        ),
      ],
      [
        storedSurvey,
        validAnswers().map((answer) =>
          answer.questionId === 'short' ? { ...answer, value: ' ' } : answer,
        ),
      ],
      [
        storedSurvey,
        validAnswers().map((answer) =>
          answer.questionId === 'long'
            ? { ...answer, value: 'x'.repeat(5001) }
            : answer,
        ),
      ],
    ];

    for (const [survey, answers] of invalidCases) {
      assert.throws(
        () => validateSurveyAnswers(survey, answers),
        HandlerError,
      );
    }
  });
});
