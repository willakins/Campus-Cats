import {
  HandlerError,
  ManagedUser,
  stringValue,
  validDocumentId,
} from '../shared/handlers';

interface Dependencies {
  getUser(id: string): Promise<ManagedUser | undefined>;
  now(): Date;
  create(
    clubId: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void>;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HandlerError('invalid-argument', 'Invalid survey');
  }
  return value as Record<string, unknown>;
}

function required(value: unknown, field: string, max: number): string {
  const result = stringValue(value, field, max).trim();
  if (!result)
    throw new HandlerError('invalid-argument', `${field} is required`);
  return result;
}

function uniqueIds(values: readonly { id: string }[]): void {
  if (new Set(values.map(({ id }) => id)).size !== values.length) {
    throw new HandlerError('invalid-argument', 'Survey IDs must be unique');
  }
}

// Nested question/option lists cannot be fully validated within Firestore's
// expression budget. This is the only client-accessible survey creation path.
export async function handleCreateSurvey(
  request: { authUid?: string; data: unknown },
  dependencies: Dependencies,
): Promise<{ id: string }> {
  if (!request.authUid)
    throw new HandlerError('unauthenticated', 'Sign in to create surveys');
  const actor = await dependencies.getUser(request.authUid);
  if (!actor || actor.banned || actor.role < 1) {
    throw new HandlerError('permission-denied', 'Officer access required');
  }
  const data = record(request.data);
  if (data.clubId !== actor.clubId)
    throw new HandlerError(
      'permission-denied',
      'Club does not match your membership',
    );
  const id = validDocumentId(data.id, 'survey ID');
  const title = required(data.title, 'title', 120);
  const details = stringValue(data.details, 'details', 5000).trim();
  const audience = data.participationAudience ?? 'all_members';
  if (
    typeof data.anonymous !== 'boolean' ||
    (audience !== 'all_members' && audience !== 'officers_only') ||
    !Array.isArray(data.questions) ||
    !data.questions.length ||
    data.questions.length > 40
  ) {
    throw new HandlerError(
      'invalid-argument',
      'Invalid survey settings or questions',
    );
  }
  const questions = data.questions.map((value) => {
    const question = record(value);
    if (
      typeof question.type !== 'string' ||
      !['single_choice', 'multi_select', 'short_text', 'long_text'].includes(
        question.type,
      ) ||
      !Array.isArray(question.options) ||
      question.options.length > 20
    ) {
      throw new HandlerError('invalid-argument', 'Invalid survey question');
    }
    const choice =
      question.type === 'single_choice' || question.type === 'multi_select';
    if (choice ? question.options.length < 2 : question.options.length !== 0) {
      throw new HandlerError('invalid-argument', 'Invalid survey options');
    }
    const options = question.options.map((value) => {
      const option = record(value);
      return {
        id: validDocumentId(option.id, 'option ID'),
        label: required(option.label, 'option', 300),
      };
    });
    uniqueIds(options);
    return {
      id: validDocumentId(question.id, 'question ID'),
      type: question.type,
      prompt: required(question.prompt, 'question', 500),
      options,
    };
  });
  uniqueIds(questions);
  await dependencies.create(actor.clubId, id, {
    title,
    details,
    anonymous: data.anonymous,
    participationAudience: audience,
    questions,
    status: 'open',
    createdAt: dependencies.now(),
    createdBy: {
      id: actor.id,
      email: actor.email,
      role: actor.role,
      clubId: actor.clubId,
      platformAdmin: actor.platformAdmin === true,
    },
  });
  return { id };
}
