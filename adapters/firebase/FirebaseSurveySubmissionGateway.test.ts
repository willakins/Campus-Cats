import { Functions } from 'firebase/functions';

import { Role, parseSurvey, parseUser } from '../../core/domain';
import { FirebaseSurveySubmissionGateway } from './FirebaseSurveySubmissionGateway';

const mockCallable = jest.fn();

jest.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => (data: unknown) =>
    mockCallable(name, data),
}));

const actor = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const survey = parseSurvey({
  id: 'survey-1',
  title: 'Volunteer interests',
  details: '',
  anonymous: true,
  status: 'open',
  questions: [
    {
      id: 'question-1',
      type: 'short_text',
      prompt: 'What should we plan?',
      options: [],
    },
  ],
  createdAt: new Date('2026-08-06T12:00:00.000Z'),
  createdBy: parseUser({
    id: 'officer-1',
    email: 'officer@gatech.edu',
    role: Role.Officer,
  }),
});
const answers = [{ questionId: survey.questions[0].id, value: 'A workshop' }];

describe('FirebaseSurveySubmissionGateway', () => {
  beforeEach(() => mockCallable.mockReset());

  it('submits only survey and answer data to the trusted callable', async () => {
    mockCallable.mockResolvedValue({
      data: { responseId: 'response-1', submittedAtMillis: 1786017600000 },
    });
    const gateway = new FirebaseSurveySubmissionGateway({} as Functions);

    await expect(gateway.submit(actor, survey, answers)).resolves.toEqual({
      responseId: 'response-1',
      submittedAt: new Date(1786017600000),
    });
    expect(mockCallable).toHaveBeenCalledWith('submitSurveyResponse', {
      surveyId: 'survey-1',
      answers,
    });
  });

  it.each([
    [{ submittedAtMillis: 1786017600000 }],
    [{ responseId: 'response-1' }],
    [{ responseId: 'response-1', submittedAtMillis: Number.NaN }],
  ])('rejects a malformed callable receipt', async (data) => {
    mockCallable.mockResolvedValue({ data });
    const gateway = new FirebaseSurveySubmissionGateway({} as Functions);

    await expect(gateway.submit(actor, survey, answers)).rejects.toThrow();
  });

  it.each([
    ['functions/already-exists', 'conflict'],
    ['failed-precondition', 'conflict'],
    ['invalid-argument', 'validation'],
  ])('preserves the callable %s error as %s', async (code, expectedCode) => {
    mockCallable.mockRejectedValue({ code, message: 'Action cannot be completed' });
    const gateway = new FirebaseSurveySubmissionGateway({} as Functions);

    await expect(gateway.submit(actor, survey, answers)).rejects.toMatchObject({
      code: expectedCode,
      message: 'Action cannot be completed',
    });
  });

  it('uses a safe fallback message and rethrows unknown dependency errors', async () => {
    const gateway = new FirebaseSurveySubmissionGateway({} as Functions);
    mockCallable.mockRejectedValueOnce({ code: 'functions/invalid-argument' });
    await expect(gateway.submit(actor, survey, answers)).rejects.toMatchObject({
      code: 'validation',
      message: 'Could not submit the survey response',
    });

    const dependencyError = new Error('offline');
    mockCallable.mockRejectedValueOnce(dependencyError);
    await expect(gateway.submit(actor, survey, answers)).rejects.toBe(dependencyError);
  });
});
