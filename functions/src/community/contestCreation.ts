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
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new HandlerError('invalid-argument', 'Invalid contest');
  return value as Record<string, unknown>;
};
const label = (value: unknown, field: string) => {
  const result = stringValue(value, field, 120).trim();
  if (!result)
    throw new HandlerError('invalid-argument', `${field} is required`);
  return result;
};
const imageUrl = (value: unknown) => {
  const result = stringValue(value, 'image URL', 2048);
  try {
    const url = new URL(result);
    // eslint-disable-next-line no-control-regex -- Do not normalize invisible URL controls.
    const invalidCharacters = /[\s\x00-\x1F\x7F\\]/u.test(result);
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      url.username ||
      url.password ||
      invalidCharacters
    )
      throw new Error();
    return result;
  } catch {
    throw new HandlerError(
      'invalid-argument',
      'Use an HTTPS image URL without credentials',
    );
  }
};

export async function handleCreateContest(
  request: { authUid?: string; data: unknown },
  dependencies: Dependencies,
): Promise<{ id: string }> {
  if (!request.authUid)
    throw new HandlerError('unauthenticated', 'Sign in to create contests');
  const actor = await dependencies.getUser(request.authUid);
  if (!actor || actor.banned || actor.role < 1)
    throw new HandlerError('permission-denied', 'Officer access required');
  const data = record(request.data);
  if (data.clubId !== actor.clubId)
    throw new HandlerError(
      'permission-denied',
      'Club does not match your membership',
    );
  const id = validDocumentId(data.id, 'contest ID');
  const title = label(data.title, 'title');
  const details = stringValue(data.details, 'details', 5000).trim();
  const audience = data.participationAudience ?? 'all_members';
  if (
    (audience !== 'all_members' && audience !== 'officers_only') ||
    !Array.isArray(data.options) ||
    data.options.length < 2 ||
    data.options.length > 20 ||
    typeof data.durationMillis !== 'number' ||
    !Number.isFinite(data.durationMillis) ||
    data.durationMillis < 86400000 ||
    data.durationMillis > 14 * 86400000
  ) {
    throw new HandlerError(
      'invalid-argument',
      'Invalid contest settings or options',
    );
  }
  const options = data.options.map((value) => {
    const option = record(value);
    return {
      id: validDocumentId(option.id, 'option ID'),
      label: label(option.label, 'option'),
      ...(option.imageUrl === undefined
        ? {}
        : { imageUrl: imageUrl(option.imageUrl) }),
    };
  });
  if (new Set(options.map(({ id }) => id)).size !== options.length)
    throw new HandlerError('invalid-argument', 'Option IDs must be unique');
  const createdAt = dependencies.now();
  await dependencies.create(actor.clubId, id, {
    kind: 'contest',
    title,
    details,
    participationAudience: audience,
    options,
    createdAt,
    votingStartsAt: createdAt,
    votingEndsAt: new Date(createdAt.getTime() + data.durationMillis),
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
