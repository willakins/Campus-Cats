import {
  HandlerError,
  ManagedUser,
  stringValue,
  validDocumentId,
} from '../shared/handlers';

interface Tag {
  id: string;
  label: string;
}
interface Assignment {
  catalogId: string;
  tagIds: string[];
}
interface Dependencies {
  getUser(id: string): Promise<ManagedUser | undefined>;
  save(
    clubId: string,
    tags: readonly Tag[],
    assignments: readonly Assignment[],
  ): Promise<void>;
}
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new HandlerError('invalid-argument', 'Invalid catalog tags');
  return value as Record<string, unknown>;
};
const unique = (values: readonly string[]) => {
  if (new Set(values).size !== values.length)
    throw new HandlerError('invalid-argument', 'Catalog tags must be unique');
};

export async function handleSaveCatalogTags(
  request: { authUid?: string; data: unknown },
  dependencies: Dependencies,
): Promise<void> {
  if (!request.authUid)
    throw new HandlerError('unauthenticated', 'Sign in to edit tags');
  const actor = await dependencies.getUser(request.authUid);
  if (!actor || actor.banned || actor.role < 1)
    throw new HandlerError('permission-denied', 'Officer access required');
  const data = record(request.data);
  if (data.clubId !== actor.clubId)
    throw new HandlerError(
      'permission-denied',
      'Club does not match your membership',
    );
  if (
    !Array.isArray(data.tags) ||
    data.tags.length > 50 ||
    !Array.isArray(data.assignments) ||
    data.assignments.length > 499
  ) {
    throw new HandlerError(
      'invalid-argument',
      'Invalid catalog tag configuration',
    );
  }
  const tags = data.tags.map((value) => {
    const tag = record(value);
    const label = stringValue(tag.label, 'tag label', 40).trim();
    if (!label)
      throw new HandlerError('invalid-argument', 'Tag label is required');
    return { id: validDocumentId(tag.id, 'tag ID'), label };
  });
  unique(tags.map(({ id }) => id));
  unique(tags.map(({ label }) => label.toLocaleLowerCase()));
  const assignments = data.assignments.map((value) => {
    const assignment = record(value);
    if (!Array.isArray(assignment.tagIds) || assignment.tagIds.length > 50)
      throw new HandlerError('invalid-argument', 'Invalid tag assignment');
    const tagIds = assignment.tagIds.map((id) => validDocumentId(id, 'tag ID'));
    unique(tagIds);
    return {
      catalogId: validDocumentId(assignment.catalogId, 'catalog ID'),
      tagIds,
    };
  });
  unique(assignments.map(({ catalogId }) => catalogId));
  await dependencies.save(actor.clubId, tags, assignments);
}
