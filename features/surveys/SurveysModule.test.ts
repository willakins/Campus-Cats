import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import {
  COLLECTIONS,
  FixedClock,
  Role,
  SequenceIdGenerator,
  SurveyAnswer,
  createPersistenceCodecs,
  dateObjectCodec,
  parseSurvey,
  parseSurveyResponse,
  parseSurveySubmissionReceipt,
  parseUser,
  surveyReceiptId,
} from '../../core/domain';
import {
  SurveySubmissionError,
  SurveySubmissionGateway,
} from '../../core/ports';
import { SurveysModule } from './SurveysModule';

const now = new Date('2026-08-06T12:00:00.000Z');
const officer = parseUser({
  id: 'officer-1',
  email: 'officer@gatech.edu',
  role: Role.Officer,
});
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const codecs = createPersistenceCodecs(dateObjectCodec);

function buildModule(submissionFailure?: Error) {
  const documents = new InMemoryDocumentStore();
  const ids = new SequenceIdGenerator([
    'survey-1',
    'question-1',
    'option-1',
    'option-2',
    'question-2',
    'response-1',
    'response-2',
    ...Array.from({ length: 40 }, (_, index) => `generated-${index + 1}`),
  ]);
  const submission: SurveySubmissionGateway = {
    async submit(actor, survey, answers) {
      if (submissionFailure) throw submissionFailure;
      const submittedAt = now;
      const response = parseSurveyResponse({
        id: ids.next(),
        surveyId: survey.id,
        answers,
        submittedAt,
        respondent: survey.anonymous ? undefined : actor,
      });
      const receipt = parseSurveySubmissionReceipt({
        surveyId: survey.id,
        responseId: response.id,
        userId: actor.id,
        submittedAt,
      });
      await documents.commit([
        {
          operation: 'put',
          collection: COLLECTIONS.surveyResponses,
          id: response.id,
          data: codecs.surveyResponse.encode(response),
        },
        {
          operation: 'put',
          collection: COLLECTIONS.surveySubmissionReceipts,
          id: surveyReceiptId(survey.id, actor.id),
          data: codecs.surveySubmissionReceipt.encode(receipt),
        },
      ]);
      return { responseId: response.id, submittedAt };
    },
  };
  return {
    documents,
    module: new SurveysModule({
      documents,
      submission,
      ids,
      clock: new FixedClock(now),
      codecs,
    }),
  };
}

const draft = {
  title: 'Fall volunteer interests',
  details: 'Help us plan community activities.',
  anonymous: true,
  questions: [
    {
      type: 'single_choice' as const,
      prompt: 'Which activity should happen first?',
      options: ['Shelter workshop', 'Campus cleanup'],
    },
    {
      type: 'short_text' as const,
      prompt: 'What should we know?',
      options: [],
    },
  ],
};

async function createSurvey(module: SurveysModule) {
  const result = await module.create(officer, draft);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

const completeQuestions = parseSurvey({
  id: 'question-template',
  title: 'Question template',
  details: '',
  anonymous: true,
  status: 'open',
  questions: [
    {
      id: 'single-question',
      type: 'single_choice',
      prompt: 'Choose one',
      options: [
        { id: 'single-a', label: 'A' },
        { id: 'single-b', label: 'B' },
      ],
    },
    {
      id: 'multi-question',
      type: 'multi_select',
      prompt: 'Choose all',
      options: [
        { id: 'multi-a', label: 'A' },
        { id: 'multi-b', label: 'B' },
      ],
    },
    {
      id: 'short-question',
      type: 'short_text',
      prompt: 'Short answer',
      options: [],
    },
    {
      id: 'long-question',
      type: 'long_text',
      prompt: 'Long answer',
      options: [],
    },
  ],
  createdAt: now,
  createdBy: officer,
}).questions;

async function seedSurvey(
  documents: InMemoryDocumentStore,
  value: Record<string, unknown> = {},
) {
  const survey = parseSurvey({
    id: 'seeded-survey',
    title: 'Seeded survey',
    details: '',
    anonymous: true,
    status: 'open',
    questions: completeQuestions,
    createdAt: now,
    createdBy: officer,
    ...value,
  });
  await documents.put(COLLECTIONS.surveys, survey.id, codecs.survey.encode(survey));
  return survey;
}

const validCompleteAnswers = (): SurveyAnswer[] => [
  {
    questionId: completeQuestions[0].id,
    value: completeQuestions[0].options[0].id,
  },
  {
    questionId: completeQuestions[1].id,
    value: [completeQuestions[1].options[0].id],
  },
  { questionId: completeQuestions[2].id, value: 'Short' },
  { questionId: completeQuestions[3].id, value: 'Long' },
];

describe('SurveysModule', () => {
  it('requires authentication for every read and submission interface', async () => {
    const { module } = buildModule();

    await expect(module.list(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.get(undefined, 'survey-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.hasSubmitted(undefined, 'survey-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.submit(undefined, 'survey-1', [])).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.create(undefined, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.close(undefined, 'survey-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.responses(undefined, 'survey-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
  });

  it('creates immutable open surveys with stable question and option IDs', async () => {
    const { module } = buildModule();

    await expect(
      module.create(officer, {
        ...draft,
        participationAudience: 'officers_only',
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: 'survey-1',
        anonymous: true,
        participationAudience: 'officers_only',
        status: 'open',
        questions: [
          {
            id: 'question-1',
            options: [{ id: 'option-1' }, { id: 'option-2' }],
          },
          { id: 'question-2', options: [] },
        ],
      },
    });
    await expect(module.list(member)).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'survey-1' }],
    });
  });

  it('reports whether any open survey still needs a response', async () => {
    const { module, documents } = buildModule();
    const survey = await createSurvey(module);

    await expect(
      module.hasIncompleteOpenSurvey(member, [survey]),
    ).resolves.toMatchObject({ ok: true, value: true });

    await documents.put(
      COLLECTIONS.surveySubmissionReceipts,
      surveyReceiptId(survey.id, member.id),
      { surveyId: survey.id },
    );
    await expect(
      module.hasIncompleteOpenSurvey(member, [survey]),
    ).resolves.toMatchObject({ ok: true, value: false });

    await expect(
      module.hasIncompleteOpenSurvey(member, [
        parseSurvey({ ...survey, status: 'closed', closedAt: now }),
      ]),
    ).resolves.toMatchObject({ ok: true, value: false });
  });

  it('enforces officer-only survey participation and excludes it from member attention', async () => {
    const { module, documents } = buildModule();
    const survey = await seedSurvey(documents, {
      participationAudience: 'officers_only',
    });
    const answers = validCompleteAnswers();

    await expect(
      module.hasIncompleteOpenSurvey(member, [survey]),
    ).resolves.toMatchObject({ ok: true, value: false });
    await expect(module.submit(member, survey.id, answers)).resolves.toEqual({
      ok: false,
      error: {
        code: 'forbidden',
        message: 'Only officers can participate in this survey',
      },
    });
    await expect(
      module.hasIncompleteOpenSurvey(officer, [survey]),
    ).resolves.toMatchObject({ ok: true, value: true });
    await expect(module.submit(officer, survey.id, answers)).resolves.toMatchObject({
      ok: true,
    });
  });

  it('sorts surveys newest first and reports missing or unavailable records', async () => {
    const { module, documents } = buildModule();
    const older = await seedSurvey(documents, {
      id: 'older',
      createdAt: new Date('2026-08-01T12:00:00.000Z'),
    });
    const newer = parseSurvey({
      ...older,
      id: 'newer',
      createdAt: new Date('2026-08-05T12:00:00.000Z'),
    });
    await documents.put(COLLECTIONS.surveys, newer.id, codecs.survey.encode(newer));

    await expect(module.list(member)).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'newer' }, { id: 'older' }],
    });
    await expect(module.get(member, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    documents.failNext('get', new Error('offline'));
    await expect(module.get(member, older.id)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('keeps valid surveys available when a stored definition is malformed', async () => {
    const { module, documents } = buildModule();
    await seedSurvey(documents);
    await documents.put(COLLECTIONS.surveys, 'invalid', {
      title: 'Broken',
      questions: 'not-a-list',
    });

    await expect(module.list(member)).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'seeded-survey' }],
      warnings: [{ code: 'partial_completion' }],
    });
  });

  it('stores anonymous answers without respondent identity and a separate receipt', async () => {
    const { module, documents } = buildModule();
    const survey = await createSurvey(module);
    const answers: SurveyAnswer[] = [
      { questionId: survey.questions[0].id, value: survey.questions[0].options[0].id },
      { questionId: survey.questions[1].id, value: 'Weekend mornings work best.' },
    ];

    await expect(module.submit(member, survey.id, answers)).resolves.toMatchObject({
      ok: true,
      value: { id: 'response-1', respondent: undefined },
    });
    expect((await documents.get(COLLECTIONS.surveyResponses, 'response-1'))?.data)
      .not.toHaveProperty('respondent');
    await expect(module.hasSubmitted(member, survey.id)).resolves.toMatchObject({
      ok: true,
      value: true,
    });
    await expect(module.submit(member, survey.id, answers)).resolves.toMatchObject({
      ok: false,
      error: { code: 'conflict' },
    });
  });

  it('attaches identity only when a survey clearly opts out of anonymity', async () => {
    const { module } = buildModule();
    const created = await module.create(officer, { ...draft, anonymous: false });
    if (!created.ok) throw new Error(created.error.message);
    const survey = created.value;

    await expect(
      module.submit(member, survey.id, [
        { questionId: survey.questions[0].id, value: survey.questions[0].options[1].id },
        { questionId: survey.questions[1].id, value: 'Named response' },
      ]),
    ).resolves.toMatchObject({
      ok: true,
      value: { respondent: { id: member.id } },
    });
  });

  it('validates question definitions and every answer type', async () => {
    const { module } = buildModule();
    await expect(module.create(member, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(
      module.create(officer, { ...draft, questions: [] }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });

    const survey = await createSurvey(module);
    await expect(
      module.submit(member, survey.id, [
        { questionId: survey.questions[0].id, value: 'not-an-option' },
        { questionId: survey.questions[1].id, value: '' },
      ]),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
  });

  it.each([
    [{ ...draft, title: '' }, 'Survey title cannot be empty.'],
    [
      { ...draft, title: 'x'.repeat(121) },
      'Survey title must be 120 characters or fewer.',
    ],
    [
      { ...draft, details: 'x'.repeat(5001) },
      'Survey details must be 5,000 characters or fewer.',
    ],
    [
      { ...draft, questions: Array.from({ length: 41 }, () => draft.questions[0]) },
      'Surveys may have up to 40 questions.',
    ],
    [
      { ...draft, questions: [{ ...draft.questions[0], prompt: '' }] },
      'Every survey question needs a prompt.',
    ],
    [
      {
        ...draft,
        questions: [{ ...draft.questions[0], prompt: 'x'.repeat(501) }],
      },
      'Survey questions must be 500 characters or fewer.',
    ],
    [
      { ...draft, questions: [{ ...draft.questions[0], options: ['Only one'] }] },
      'Choice questions need at least two options.',
    ],
    [
      { ...draft, questions: [{ ...draft.questions[0], options: ['A', ''] }] },
      'Choice question options cannot be empty.',
    ],
    [
      {
        ...draft,
        questions: [
          {
            ...draft.questions[0],
            options: Array.from({ length: 21 }, (_, index) => `Option ${index}`),
          },
        ],
      },
      'Choice questions may have up to 20 options.',
    ],
    [
      {
        ...draft,
        questions: [{ ...draft.questions[0], options: ['A', 'x'.repeat(301)] }],
      },
      'Choice question options must be 300 characters or fewer.',
    ],
    [
      { ...draft, questions: [{ ...draft.questions[0], options: ['Same', 'same'] }] },
      'Choice question options must be unique.',
    ],
    [
      {
        ...draft,
        questions: [
          { type: 'short_text' as const, prompt: 'Short', options: ['Invalid'] },
        ],
      },
      'Text questions cannot have answer options.',
    ],
  ])('returns a precise survey-definition validation error', async (invalidDraft, message) => {
    await expect(buildModule().module.create(officer, invalidDraft)).resolves.toEqual({
      ok: false,
      error: { code: 'validation', message },
    });
  });

  it('creates select-all questions and accepts every supported answer type', async () => {
    const { module } = buildModule();
    const created = await module.create(officer, {
      title: 'All question types',
      details: '',
      anonymous: true,
      questions: [
        { type: 'multi_select', prompt: 'Select all', options: ['A', 'B'] },
        { type: 'long_text', prompt: 'Explain', options: [] },
      ],
    });
    expect(created).toMatchObject({
      ok: true,
      value: {
        questions: [
          { type: 'multi_select', options: [{ label: 'A' }, { label: 'B' }] },
          { type: 'long_text', options: [] },
        ],
      },
    });
  });

  it.each([
    [validCompleteAnswers().slice(0, 3), 'Answer every survey question.'],
    [
      [
        { questionId: 'single-question', value: 'single-a' },
        { questionId: 'single-question', value: 'single-b' },
        { questionId: 'short-question', value: 'Short' },
        { questionId: 'long-question', value: 'Long' },
      ],
      'Answer every survey question once.',
    ],
    [
      [
        { questionId: 'unknown-question', value: 'Unknown' },
        ...validCompleteAnswers().slice(1),
      ],
      'Answer every survey question.',
    ],
    [
      [
        { questionId: 'single-question', value: ['single-a'] },
        ...validCompleteAnswers().slice(1),
      ],
      'Choose one valid option for every multiple-choice question.',
    ],
    [
      validCompleteAnswers().map((answer) =>
        answer.questionId === 'multi-question'
          ? { ...answer, value: 'multi-a' }
          : answer,
      ),
      'Choose at least one valid option for every select-all question.',
    ],
    [
      validCompleteAnswers().map((answer) =>
        answer.questionId === 'multi-question' ? { ...answer, value: [] } : answer,
      ),
      'Choose at least one valid option for every select-all question.',
    ],
    [
      validCompleteAnswers().map((answer) =>
        answer.questionId === 'multi-question'
          ? { ...answer, value: ['multi-a', 'multi-a'] }
          : answer,
      ),
      'Choose at least one valid option for every select-all question.',
    ],
    [
      validCompleteAnswers().map((answer) =>
        answer.questionId === 'multi-question'
          ? { ...answer, value: ['not-an-option'] }
          : answer,
      ),
      'Choose at least one valid option for every select-all question.',
    ],
    [
      validCompleteAnswers().map((answer) =>
        answer.questionId === 'short-question' ? { ...answer, value: [] } : answer,
      ),
      'Answer every text question.',
    ],
    [
      validCompleteAnswers().map((answer) =>
        answer.questionId === 'short-question' ? { ...answer, value: ' ' } : answer,
      ),
      'Answer every text question.',
    ],
    [
      validCompleteAnswers().map((answer) =>
        answer.questionId === 'short-question'
          ? { ...answer, value: 'x'.repeat(501) }
          : answer,
      ),
      'Short answers must be 500 characters or fewer.',
    ],
    [
      validCompleteAnswers().map((answer) =>
        answer.questionId === 'long-question'
          ? { ...answer, value: 'x'.repeat(5001) }
          : answer,
      ),
      'Long answers must be 5,000 characters or fewer.',
    ],
  ])('validates submitted answer structure', async (answers, message) => {
    const { module, documents } = buildModule();
    const survey = await seedSurvey(documents);

    await expect(module.submit(member, survey.id, answers as SurveyAnswer[])).resolves.toEqual({
      ok: false,
      error: { code: 'validation', message },
    });
  });

  it('lets officers close surveys and retain all past response history', async () => {
    const { module } = buildModule();
    const survey = await createSurvey(module);
    await module.submit(member, survey.id, [
      { questionId: survey.questions[0].id, value: survey.questions[0].options[0].id },
      { questionId: survey.questions[1].id, value: 'A response' },
    ]);

    await expect(module.responses(member, survey.id)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.close(officer, survey.id)).resolves.toMatchObject({
      ok: true,
      value: { status: 'closed', closedAt: now },
    });
    await expect(module.responses(officer, survey.id)).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'response-1' }],
    });
    await expect(
      module.submit(member, survey.id, []),
    ).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } });
    await expect(module.close(officer, survey.id)).resolves.toMatchObject({
      ok: false,
      error: { code: 'conflict' },
    });
  });

  it('reports close, receipt, response-write, and history failures', async () => {
    const closeFailure = buildModule();
    const closingSurvey = await createSurvey(closeFailure.module);
    closeFailure.documents.failNext('put', new Error('offline'));
    await expect(
      closeFailure.module.close(officer, closingSurvey.id),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });

    const receiptFailure = buildModule();
    receiptFailure.documents.failNext('get', new Error('offline'));
    await expect(
      receiptFailure.module.hasSubmitted(member, 'survey-1'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });

    const commitFailure = buildModule();
    const survey = await seedSurvey(commitFailure.documents);
    commitFailure.documents.failNext('commit', new Error('offline'));
    await expect(
      commitFailure.module.submit(member, survey.id, validCompleteAnswers()),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });

    const historyFailure = buildModule();
    historyFailure.documents.failNext('listWhereEqual', new Error('offline'));
    await expect(
      historyFailure.module.responses(officer, 'survey-1'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });
  });

  it.each([
    ['conflict' as const, 'This survey was just closed'],
    ['validation' as const, 'The submitted answers are invalid'],
  ])('preserves a trusted submission %s error', async (code, message) => {
    const { module } = buildModule(new SurveySubmissionError(code, message));
    const survey = await createSurvey(module);
    const answers: SurveyAnswer[] = [
      { questionId: survey.questions[0].id, value: survey.questions[0].options[0].id },
      { questionId: survey.questions[1].id, value: 'Answer' },
    ];

    await expect(module.submit(member, survey.id, answers)).resolves.toEqual({
      ok: false,
      error: { code, message },
    });
  });

  it('sorts response history newest first', async () => {
    const { module, documents } = buildModule();
    const response = (id: string, submittedAt: string) =>
      parseSurveyResponse({
        id,
        surveyId: 'survey-1',
        answers: [{ questionId: 'question-1', value: 'Answer' }],
        submittedAt: new Date(submittedAt),
      });
    const older = response('older', '2026-08-01T12:00:00.000Z');
    const newer = response('newer', '2026-08-05T12:00:00.000Z');
    await documents.put(
      COLLECTIONS.surveyResponses,
      older.id,
      codecs.surveyResponse.encode(older),
    );
    await documents.put(
      COLLECTIONS.surveyResponses,
      newer.id,
      codecs.surveyResponse.encode(newer),
    );

    await expect(module.responses(officer, 'survey-1')).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'newer' }, { id: 'older' }],
    });
  });

  it('keeps valid response history available when a stored response is malformed', async () => {
    const { module, documents } = buildModule();
    const valid = parseSurveyResponse({
      id: 'valid',
      surveyId: 'survey-1',
      answers: [{ questionId: 'question-1', value: 'Answer' }],
      submittedAt: now,
    });
    await documents.put(
      COLLECTIONS.surveyResponses,
      valid.id,
      codecs.surveyResponse.encode(valid),
    );
    await documents.put(COLLECTIONS.surveyResponses, 'invalid', {
      surveyId: 'survey-1',
      answers: 'not-an-answer-list',
      submittedAt: now,
    });

    await expect(module.responses(officer, 'survey-1')).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'valid' }],
      warnings: [{ code: 'partial_completion' }],
    });
  });

  it('maps document failures to typed outcomes', async () => {
    const { module, documents } = buildModule();
    documents.failNext('list', new Error('offline'));
    await expect(module.list(member)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    documents.failNext('put', new Error('offline'));
    await expect(module.create(officer, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });
});
