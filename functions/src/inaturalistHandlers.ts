import { HandlerError, ManagedUser } from './handlers';
import { ImportedRecordKind } from './firebaseInaturalist';
import { SyncRunSummary } from './inaturalist';

type SyncRunResult = Pick<SyncRunSummary, 'status' | 'runId'>;

export interface InaturalistHandlerDependencies {
  getUser(id: string): Promise<ManagedUser | undefined>;
  runSync(): Promise<SyncRunResult>;
  moderate(
    kind: ImportedRecordKind,
    id: number,
    hidden: boolean,
    reason: string,
    actorId: string,
  ): Promise<void>;
  updateCatalogOverrides(
    id: number,
    overrides: Readonly<Record<string, unknown>>,
  ): Promise<void>;
  linkCatalog(id: number, localCatalogId?: string): Promise<void>;
}

interface HandlerRequest<T> {
  readonly authUid?: string;
  readonly data: T;
}

export async function handleRunInaturalistSync(
  request: HandlerRequest<Record<string, never>>,
  dependencies: InaturalistHandlerDependencies,
): Promise<SyncRunResult> {
  await requireAdmin(request.authUid, dependencies);
  const result = await dependencies.runSync();
  return { status: result.status, runId: result.runId };
}

export async function handleModerateInaturalistRecord(
  request: HandlerRequest<{
    readonly kind?: unknown;
    readonly id?: unknown;
    readonly hidden?: unknown;
    readonly reason?: unknown;
  }>,
  dependencies: InaturalistHandlerDependencies,
): Promise<{ readonly success: true }> {
  const actor = await requireAdmin(request.authUid, dependencies);
  const kind = importedKind(request.data.kind);
  const id = positiveInteger(request.data.id, 'id');
  if (typeof request.data.hidden !== 'boolean') {
    throw new HandlerError('invalid-argument', 'hidden must be a boolean');
  }
  const reason = stringValue(request.data.reason, 'reason').trim();
  if (reason.length > 500) {
    throw new HandlerError(
      'invalid-argument',
      'reason must be 500 characters or fewer',
    );
  }
  if (request.data.hidden && !reason) {
    throw new HandlerError(
      'invalid-argument',
      'reason is required when hiding a record',
    );
  }
  await dependencies.moderate(
    kind,
    id,
    request.data.hidden,
    reason,
    actor.id,
  );
  return { success: true };
}

export async function handleUpdateInaturalistCatalog(
  request: HandlerRequest<{
    readonly id?: unknown;
    readonly overrides?: unknown;
  }>,
  dependencies: InaturalistHandlerDependencies,
): Promise<{ readonly success: true }> {
  await requireAdmin(request.authUid, dependencies);
  const id = positiveInteger(request.data.id, 'id');
  const overrides = catalogOverrides(request.data.overrides);
  await dependencies.updateCatalogOverrides(id, overrides);
  return { success: true };
}

export async function handleLinkInaturalistCatalog(
  request: HandlerRequest<{
    readonly id?: unknown;
    readonly localCatalogId?: unknown;
  }>,
  dependencies: InaturalistHandlerDependencies,
): Promise<{ readonly success: true }> {
  await requireAdmin(request.authUid, dependencies);
  const id = positiveInteger(request.data.id, 'id');
  const rawLocalId = request.data.localCatalogId;
  const localCatalogId =
    rawLocalId === null || rawLocalId === undefined
      ? undefined
      : requiredString(rawLocalId, 'localCatalogId');
  await dependencies.linkCatalog(id, localCatalogId);
  return { success: true };
}

async function requireAdmin(
  uid: string | undefined,
  dependencies: Pick<InaturalistHandlerDependencies, 'getUser'>,
): Promise<ManagedUser> {
  if (!uid) throw new HandlerError('unauthenticated', 'Authentication required');
  const actor = await dependencies.getUser(uid);
  if (!actor || actor.role < 1) {
    throw new HandlerError(
      'permission-denied',
      'Administrator access required',
    );
  }
  return actor;
}

function importedKind(value: unknown): ImportedRecordKind {
  if (value !== 'observation' && value !== 'catalog') {
    throw new HandlerError(
      'invalid-argument',
      'kind must be observation or catalog',
    );
  }
  return value;
}

const stringOverrideFields = new Set([
  'name',
  'descShort',
  'descLong',
  'colorPattern',
  'behavior',
  'yearsRecorded',
  'AoR',
  'furPattern',
  'coverPhotoId',
]);

function catalogOverrides(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HandlerError('invalid-argument', 'overrides must be an object');
  }
  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(input)) {
    if (stringOverrideFields.has(key)) {
      const parsed = requiredString(fieldValue, key);
      if (parsed.length > 5000) {
        throw new HandlerError(
          'invalid-argument',
          `${key} must be 5000 characters or fewer`,
        );
      }
      output[key] = parsed;
      continue;
    }
    if (key === 'currentStatus') {
      output[key] = enumValue(
        fieldValue,
        key,
        ['Feral', 'Adopted', 'Deceased', 'Frat Cat', 'Unknown'],
      );
      continue;
    }
    if (key === 'furLength') {
      output[key] = enumValue(fieldValue, key, [
        'Short',
        'Medium',
        'Long',
        'Unknown',
      ]);
      continue;
    }
    if (key === 'tnr') {
      output[key] = enumValue(fieldValue, key, ['Yes', 'No', 'Unknown']);
      continue;
    }
    if (key === 'sex') {
      output[key] = enumValue(fieldValue, key, [
        'Male',
        'Female',
        'Unknown',
      ]);
      continue;
    }
    throw new HandlerError(
      'invalid-argument',
      `${key} is not an allowed catalog override`,
    );
  }
  return output;
}

function enumValue(
  value: unknown,
  field: string,
  allowed: readonly string[],
): string {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new HandlerError(
      'invalid-argument',
      `${field} must be one of: ${allowed.join(', ')}`,
    );
  }
  return value;
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new HandlerError(
      'invalid-argument',
      `${field} must be a positive integer`,
    );
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  const parsed = stringValue(value, field).trim();
  if (!parsed) {
    throw new HandlerError('invalid-argument', `${field} is required`);
  }
  return parsed;
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new HandlerError(
      'invalid-argument',
      `${field} must be a string`,
    );
  }
  return value;
}
