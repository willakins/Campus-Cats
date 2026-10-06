import { HandlerError, validDocumentId } from './handlers';
export type RecordKind = 'catalog' | 'sighting' | 'station';
export interface FieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'choice';
  options: string[];
  active: boolean;
}
export const recordCollections: Record<RecordKind, string> = {
  catalog: 'catalog',
  sighting: 'cat-sightings',
  station: 'stations',
};
const invalid = (message: string): never => {
  throw new HandlerError('invalid-argument', message);
};
export function fieldRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return invalid('Expected an object');
  return value as Record<string, unknown>;
}
export function fieldKind(value: unknown): RecordKind {
  if (value !== 'catalog' && value !== 'sighting' && value !== 'station')
    return invalid('Invalid record type');
  return value;
}
function fieldText(value: unknown, maximum: number): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > maximum ||
    // eslint-disable-next-line no-control-regex -- Reject unsupported controls in submitted text.
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    return invalid('Invalid field text');
  return value.trim();
}
export function validateFieldDefinitions(
  value: unknown,
  previous: readonly FieldDefinition[],
): FieldDefinition[] {
  if (!Array.isArray(value) || value.length > 20)
    return invalid('At most 20 fields per record type');
  const fields = value.map((raw) => {
    const field = fieldRecord(raw);
    const id = fieldText(field.id, 80);
    if (
      !/^[A-Za-z0-9_-]+$/.test(id) ||
      id === '__proto__' ||
      id === 'constructor' ||
      id === 'prototype'
    )
      return invalid('Invalid field ID');
    if (
      !['text', 'number', 'boolean', 'choice'].includes(String(field.type)) ||
      typeof field.active !== 'boolean'
    )
      return invalid('Invalid field type');
    if (!Array.isArray(field.options) || field.options.length > 20)
      return invalid('Invalid choices');
    const options = field.options.map((option) => fieldText(option, 80));
    if (
      (field.type === 'choice' && options.length < 2) ||
      (field.type !== 'choice' && options.length) ||
      new Set(options).size !== options.length
    )
      return invalid('Use 2–20 unique choices for choice fields');
    return {
      id,
      label: fieldText(field.label, 80),
      type: field.type as FieldDefinition['type'],
      options,
      active: field.active,
    };
  });
  if (
    new Set(fields.map((field) => field.id)).size !== fields.length ||
    new Set(fields.map((field) => field.label.toLowerCase())).size !==
      fields.length
  )
    return invalid('Field IDs and labels must be unique');
  for (const old of previous) {
    const next = fields.find((field) => field.id === old.id);
    if (
      !next ||
      next.type !== old.type ||
      old.options.some((option) => !next.options.includes(option))
    )
      return invalid(
        'Archive fields instead of removing them or changing their type/choices',
      );
  }
  return fields;
}
export function validateFieldValues(
  raw: unknown,
  fields: readonly FieldDefinition[],
): Record<string, string | number | boolean | null> {
  const values = fieldRecord(raw);
  if (Object.keys(values).length > 20)
    return invalid('At most 20 field values');
  for (const [id, value] of Object.entries(values)) {
    const field = fields.find((field) => field.id === id && field.active);
    if (!field) return invalid('Unknown or archived field');
    if (value === null) continue;
    if (field.type === 'text') {
      if (
        typeof value !== 'string' ||
        value.length > 1000 ||
        // eslint-disable-next-line no-control-regex -- Reject unsupported controls in submitted text.
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
      )
        return invalid(`Invalid ${field.label}`);
    } else if (field.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value))
        return invalid(`Invalid ${field.label}`);
    } else if (field.type === 'boolean') {
      if (typeof value !== 'boolean') return invalid(`Invalid ${field.label}`);
    } else if (typeof value !== 'string' || !field.options.includes(value))
      return invalid(`Invalid ${field.label}`);
  }
  return values as Record<string, string | number | boolean | null>;
}
export function mayEditFieldValues(
  role: number,
  kind: RecordKind,
  uid: string,
  ownerId?: string,
): boolean {
  return kind === 'sighting' ? uid === ownerId : role >= 1;
}

export interface CustomFieldContext {
  readonly actor?: Record<string, unknown>;
  readonly clubAccessible: boolean;
  readonly fields: readonly FieldDefinition[];
  readonly record?: {
    readonly exists: boolean;
    readonly path: string;
    readonly ownerId?: string;
  };
  readonly previousValues?: Record<string, unknown>;
}
export interface CustomFieldTransaction {
  load(
    uid: string,
    clubId: string,
    kind: RecordKind,
    recordId?: string,
  ): Promise<CustomFieldContext>;
  saveDefinitions(
    clubId: string,
    kind: RecordKind,
    fields: readonly FieldDefinition[],
  ): void;
  saveValues(
    clubId: string,
    kind: RecordKind,
    recordId: string,
    recordPath: string,
    values: Record<string, unknown>,
  ): void;
}
export async function handleSaveCustomFields(
  request: {
    authUid: string;
    authTime?: number;
    mode: 'definitions' | 'values';
    data: unknown;
  },
  dependencies: {
    transact(
      operation: (store: CustomFieldTransaction) => Promise<void>,
    ): Promise<void>;
  },
): Promise<void> {
  const data = fieldRecord(request.data);
  const kind = fieldKind(data.kind);
  const clubId = validDocumentId(data.clubId, 'club ID');
  const id =
    request.mode === 'values'
      ? validDocumentId(data.recordId, 'record ID')
      : undefined;
  await dependencies.transact(async (store) => {
    const context = await store.load(request.authUid, clubId, kind, id);
    const actor = context.actor;
    if (
      !actor ||
      actor.clubId !== clubId ||
      actor.banned ||
      actor.deletionPending ||
      actor.agreedToTerms !== true ||
      actor.termsVersion !== '2026-08-28' ||
      typeof actor.role !== 'number' ||
      !Number.isInteger(actor.role) ||
      actor.role < 0 ||
      actor.role > 4 ||
      !context.clubAccessible ||
      (actor.sessionRevokedAt !== undefined &&
        (typeof actor.sessionRevokedAt !== 'number' ||
          !Number.isSafeInteger(actor.sessionRevokedAt) ||
          typeof request.authTime !== 'number' ||
          request.authTime <= actor.sessionRevokedAt))
    )
      throw new HandlerError(
        'permission-denied',
        'Active club membership required',
      );
    if (request.mode === 'definitions') {
      if (actor.role < 3)
        throw new HandlerError(
          'permission-denied',
          'President access required',
        );
      store.saveDefinitions(
        clubId,
        kind,
        validateFieldDefinitions(data.fields, context.fields),
      );
    } else {
      if (!id || !context.record?.exists)
        throw new HandlerError('not-found', 'Record no longer exists');
      if (
        !mayEditFieldValues(
          actor.role,
          kind,
          request.authUid,
          context.record.ownerId,
        )
      )
        throw new HandlerError(
          'permission-denied',
          'You cannot edit this record',
        );
      const values = validateFieldValues(data.values, context.fields);
      store.saveValues(clubId, kind, id, context.record.path, {
        ...context.previousValues,
        ...values,
      });
    }
  });
}
