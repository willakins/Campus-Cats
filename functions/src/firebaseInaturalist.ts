import {
  FieldValue,
  Firestore,
  Timestamp,
} from 'firebase-admin/firestore';

import {
  CatalogImport,
  ImportRepository,
  ObservationImport,
  ObservationCommentImport,
  SyncRunSummary,
  UpsertCounts,
  normalizeCatName,
} from './inaturalist';

const OBSERVATIONS = 'inaturalist-observations';
const CATALOG = 'inaturalist-guide-profiles';
const LOCAL_CATALOG = 'catalog';
const STATE = 'integration-state';
const COMMENTS = 'sighting-comments';
const COMMENT_MODERATION = 'inaturalist-comment-moderation';
const STATE_ID = 'inaturalist';
const WRITE_BATCH_SIZE = 400;

export type ImportedRecordKind = 'observation' | 'catalog';

export class FirebaseInaturalistRepository implements ImportRepository {
  constructor(
    private readonly firestore: Firestore,
    private readonly clubId = 'campus-cats',
  ) {}

  async acquireLease(
    runId: string,
    now: Date,
    leaseUntil: Date,
  ): Promise<boolean> {
    const reference = this.collection(STATE).doc(STATE_ID);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const data = snapshot.data();
      const currentLease = timestampDate(data?.leaseUntil);
      if (data?.running === true && currentLease && currentLease > now) {
        return false;
      }
      transaction.set(
        reference,
        {
          running: true,
          runId,
          startedAt: Timestamp.fromDate(now),
          leaseUntil: Timestamp.fromDate(leaseUntil),
        },
        { merge: true },
      );
      return true;
    });
  }

  async releaseLease(runId: string): Promise<void> {
    const reference = this.collection(STATE).doc(STATE_ID);
    await this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (snapshot.data()?.runId !== runId) return;
      transaction.set(
        reference,
        {
          running: false,
          leaseUntil: FieldValue.delete(),
        },
        { merge: true },
      );
    });
  }

  async listGuideNames() {
    const snapshot = await this.collection(CATALOG)
      .where('sourceActive', '==', true)
      .get();
    return snapshot.docs.flatMap((document) => {
      const data = document.data();
      const id = Number(document.id);
      return Number.isInteger(id) &&
        id > 0 &&
        typeof data.displayName === 'string'
        ? [
            {
              id,
              displayName: data.displayName,
              linkedLocalCatalogId:
                typeof data.linkedLocalCatalogId === 'string'
                  ? data.linkedLocalCatalogId
                  : undefined,
            },
          ]
        : [];
    });
  }

  async listLocalCatalogEntries() {
    const snapshot = await this.collection(LOCAL_CATALOG).get();
    return snapshot.docs.flatMap((document) => {
      const cat = objectValue(document.data().cat);
      return typeof cat?.name === 'string'
        ? [{ id: document.id, name: cat.name }]
        : [];
    });
  }

  async upsertObservations(
    values: readonly ObservationImport[],
  ): Promise<UpsertCounts> {
    let created = 0;
    let updated = 0;
    for (const valuesChunk of chunks(values, WRITE_BATCH_SIZE)) {
      const references = valuesChunk.map(({ id }) =>
        this.collection(OBSERVATIONS).doc(String(id)),
      );
      const counts = await this.firestore.runTransaction(async (transaction) => {
        const existing = await transaction.getAll(...references);
        let chunkCreated = 0;
        let chunkUpdated = 0;
        valuesChunk.forEach((value, index) => {
          const prior = existing[index];
          if (prior.exists) chunkUpdated += 1;
          else chunkCreated += 1;
          const priorData = prior.data();
          const moderation = moderationValue(priorData?.moderation);
          const serialized = serializeObservation(value);
          const priorGuideTaxonId = positiveIntegerValue(
            priorData?.guideTaxonId,
          );
          if (
            value.guideTaxonId === undefined &&
            priorGuideTaxonId !== undefined &&
            sameNormalizedName(
              stringValue(priorData?.observationFieldValue),
              value.observationFieldValue,
            )
          ) {
            serialized.guideTaxonId = priorGuideTaxonId;
          }
          transaction.set(references[index], {
            ...serialized,
            importedAt:
              priorData?.importedAt ?? Timestamp.fromDate(value.importedAt),
            moderation: serializeModeration(moderation),
            visible: value.sourceActive && !moderation.hidden,
          });
        });
        return { created: chunkCreated, updated: chunkUpdated };
      });
      created += counts.created;
      updated += counts.updated;
      await this.upsertObservationComments(
        valuesChunk.flatMap(({comments}) => comments),
      );
    }
    return { created, updated };
  }

  async removeMissingObservationComments(
    seen: ReadonlySet<string>,
  ): Promise<number> {
    const snapshot = await this.collection(COMMENTS)
      .where('source', '==', 'inaturalist')
      .get();
    const missing = snapshot.docs.filter((document) => {
      const uuid = stringValue(document.data().sourceCommentUuid);
      return !uuid || !seen.has(uuid);
    });
    for (const documentChunk of chunks(missing, WRITE_BATCH_SIZE)) {
      const batch = this.firestore.batch();
      documentChunk.forEach((document) => batch.delete(document.ref));
      await batch.commit();
    }
    return missing.length;
  }

  async upsertCatalog(values: readonly CatalogImport[]): Promise<UpsertCounts> {
    let created = 0;
    let updated = 0;
    for (const valuesChunk of chunks(values, WRITE_BATCH_SIZE)) {
      const references = valuesChunk.map(({ id }) =>
        this.collection(CATALOG).doc(String(id)),
      );
      const counts = await this.firestore.runTransaction(async (transaction) => {
        const existing = await transaction.getAll(...references);
        let chunkCreated = 0;
        let chunkUpdated = 0;
        valuesChunk.forEach((value, index) => {
          const prior = existing[index];
          if (prior.exists) chunkUpdated += 1;
          else chunkCreated += 1;
          const priorData = prior.data();
          const moderation = moderationValue(priorData?.moderation);
          const linkedLocalCatalogId =
            stringValue(priorData?.linkedLocalCatalogId) ??
            value.linkedLocalCatalogId;
          const document: Record<string, unknown> = {
            ...serializeCatalog(value),
            importedAt:
              priorData?.importedAt ?? Timestamp.fromDate(value.importedAt),
            moderation: serializeModeration(moderation),
            overrides: objectValue(priorData?.overrides) ?? {},
            matchStatus: linkedLocalCatalogId ? 'linked' : value.matchStatus,
            visible: value.sourceActive && !moderation.hidden,
          };
          if (linkedLocalCatalogId) {
            document.linkedLocalCatalogId = linkedLocalCatalogId;
          }
          transaction.set(references[index], document);
        });
        return { created: chunkCreated, updated: chunkUpdated };
      });
      created += counts.created;
      updated += counts.updated;
    }
    return { created, updated };
  }

  async deactivateMissingObservations(
    seen: ReadonlySet<number>,
    now: Date,
  ): Promise<number> {
    return this.deactivateMissing(OBSERVATIONS, seen, now);
  }

  async deactivateMissingCatalog(
    seen: ReadonlySet<number>,
    now: Date,
  ): Promise<number> {
    return this.deactivateMissing(CATALOG, seen, now);
  }

  async completeRun(summary: SyncRunSummary): Promise<void> {
    const reference = this.collection(STATE).doc(STATE_ID);
    await this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const previous = snapshot.data();
      transaction.set(
        reference,
        {
          runId: summary.runId,
          startedAt: Timestamp.fromDate(summary.startedAt),
          completedAt: Timestamp.fromDate(summary.completedAt),
          lastStatus: summary.status,
          observations: sourceStatus(
            summary.observations,
            summary.startedAt,
            summary.completedAt,
            objectValue(previous?.observations),
          ),
          catalog: sourceStatus(
            summary.catalog,
            summary.startedAt,
            summary.completedAt,
            objectValue(previous?.catalog),
          ),
          ambiguousCatalogMatches: summary.ambiguousCatalogMatches,
        },
        { merge: true },
      );
    });
  }

  async moderate(
    kind: ImportedRecordKind,
    id: number,
    hidden: boolean,
    reason: string,
    actorId: string,
    now: Date,
  ): Promise<void> {
    const reference = this.collection(
      kind === 'observation' ? OBSERVATIONS : CATALOG,
    )
      .doc(String(id));
    await this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) throw new Error('Imported record not found');
      const sourceActive = snapshot.data()?.sourceActive === true;
      transaction.update(reference, {
        moderation: {
          hidden,
          reason,
          updatedBy: actorId,
          updatedAt: Timestamp.fromDate(now),
        },
        visible: sourceActive && !hidden,
      });
    });
  }

  async updateCatalogOverrides(
    id: number,
    overrides: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const reference = this.collection(CATALOG).doc(String(id));
    const snapshot = await reference.get();
    if (!snapshot.exists) throw new Error('Imported catalog profile not found');
    await reference.update({ overrides });
  }

  async linkCatalog(id: number, localCatalogId?: string): Promise<void> {
    const reference = this.collection(CATALOG).doc(String(id));
    await this.firestore.runTransaction(async (transaction) => {
      const imported = await transaction.get(reference);
      if (!imported.exists) {
        throw new Error('Imported catalog profile not found');
      }
      if (localCatalogId) {
        const localReference = this.collection(LOCAL_CATALOG).doc(localCatalogId);
        const existingLinkQuery = this.collection(CATALOG)
          .where('linkedLocalCatalogId', '==', localCatalogId);
        const [local, existingLinks] = await Promise.all([
          transaction.get(localReference),
          transaction.get(existingLinkQuery),
        ]);
        if (!local.exists) throw new Error('Local catalog profile not found');
        if (existingLinks.docs.some((document) => document.id !== String(id))) {
          throw new Error('Local catalog profile is already linked');
        }
      }
      transaction.update(reference, {
        linkedLocalCatalogId: localCatalogId ?? FieldValue.delete(),
        matchStatus: localCatalogId ? 'linked' : 'unlinked',
      });
    });
  }

  private async deactivateMissing(
    collection: string,
    seen: ReadonlySet<number>,
    now: Date,
  ): Promise<number> {
    const snapshot = await this.collection(collection)
      .where('sourceActive', '==', true)
      .get();
    const missing = snapshot.docs.filter(
      (document) => !seen.has(Number(document.id)),
    );
    for (const documentChunk of chunks(missing, WRITE_BATCH_SIZE)) {
      const batch = this.firestore.batch();
      for (const document of documentChunk) {
        batch.update(document.ref, {
          sourceActive: false,
          visible: false,
          syncedAt: Timestamp.fromDate(now),
        });
      }
      await batch.commit();
    }
    return missing.length;
  }

  private async upsertObservationComments(
    comments: readonly ObservationCommentImport[],
  ): Promise<void> {
    for (const commentChunk of chunks(comments, WRITE_BATCH_SIZE)) {
      const commentReferences = commentChunk.map(({uuid}) =>
        this.collection(COMMENTS).doc(importedCommentDocumentId(uuid)),
      );
      const moderationReferences = commentReferences.map(({id}) =>
        this.collection(COMMENT_MODERATION).doc(id),
      );
      await this.firestore.runTransaction(async (transaction) => {
        const moderation = await transaction.getAll(...moderationReferences);
        commentChunk.forEach((comment, index) => {
          const reference = commentReferences[index];
          if (moderation[index].exists) {
            transaction.delete(reference);
          } else {
            transaction.set(reference, observationCommentDocument(comment));
          }
        });
      });
    }
  }

  private collection(name: string) {
    return this.firestore.collection('clubs').doc(this.clubId).collection(name);
  }
}

function serializeObservation(value: ObservationImport): Record<string, unknown> {
  const { id: _id, comments: _comments, ...stored } = value;
  return compactObject({
    ...stored,
    sourceUpdatedAt: Timestamp.fromDate(value.sourceUpdatedAt),
    observedAt: Timestamp.fromDate(value.observedAt),
    importedAt: Timestamp.fromDate(value.importedAt),
    syncedAt: Timestamp.fromDate(value.syncedAt),
    moderation: serializeModeration(value.moderation),
  });
}

export function observationCommentDocument(
  value: ObservationCommentImport,
): Record<string, unknown> {
  const targetId = `inat-observation-${value.observationId}`;
  return compactObject({
    schemaVersion: value.schemaVersion,
    source: 'inaturalist',
    target: {
      kind: 'sighting',
      id: targetId,
      documentId: String(value.observationId),
    },
    targetKey: `sighting:${targetId}`,
    body: value.body,
    createdAt: Timestamp.fromDate(value.createdAt),
    sourceUpdatedAt: Timestamp.fromDate(value.sourceUpdatedAt),
    sourceCommentId: value.id,
    sourceCommentUuid: value.uuid,
    sourceUrl: value.sourceUrl,
    externalAuthor: value.author,
    lastSeenRunId: value.lastSeenRunId,
  });
}

export function importedCommentDocumentId(uuid: string): string {
  return `inat-comment-${uuid}`;
}

function serializeCatalog(value: CatalogImport): Record<string, unknown> {
  const { id: _id, linkedLocalCatalogId: _linked, ...stored } = value;
  return compactObject({
    ...stored,
    sourceUpdatedAt: Timestamp.fromDate(value.sourceUpdatedAt),
    importedAt: Timestamp.fromDate(value.importedAt),
    syncedAt: Timestamp.fromDate(value.syncedAt),
    moderation: serializeModeration(value.moderation),
  });
}

function serializeModeration(value: ImportModerationValue) {
  return {
    hidden: value.hidden,
    reason: value.reason,
    ...(value.updatedBy ? { updatedBy: value.updatedBy } : {}),
    ...(value.updatedAt
      ? { updatedAt: Timestamp.fromDate(value.updatedAt) }
      : {}),
  };
}

interface ImportModerationValue {
  readonly hidden: boolean;
  readonly reason: string;
  readonly updatedBy?: string;
  readonly updatedAt?: Date;
}

function moderationValue(value: unknown): ImportModerationValue {
  const data = objectValue(value);
  return {
    hidden: data?.hidden === true,
    reason: stringValue(data?.reason) ?? '',
    updatedBy: stringValue(data?.updatedBy),
    updatedAt: timestampDate(data?.updatedAt),
  };
}

function sourceStatus(
  summary: SyncRunSummary['observations'],
  attemptedAt: Date,
  completedAt: Date,
  previous: Record<string, unknown> | undefined,
) {
  return {
    ...summary,
    lastAttemptAt: Timestamp.fromDate(attemptedAt),
    lastSuccessAt:
      summary.errors.length === 0
        ? Timestamp.fromDate(completedAt)
        : previous?.lastSuccessAt ?? null,
  };
}

function chunks<T>(values: readonly T[], size: number): readonly T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function positiveIntegerValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function sameNormalizedName(
  left: string | undefined,
  right: string | undefined,
): boolean {
  return Boolean(
    left &&
      right &&
      normalizeCatName(left) === normalizeCatName(right),
  );
}

function compactObject(
  value: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      if (child === undefined) return [];
      if (Array.isArray(child)) {
        return [[
          key,
          child.map((item) =>
            isPlainObject(item) ? compactObject(item) : item,
          ),
        ]];
      }
      return [[key, isPlainObject(child) ? compactObject(child) : child]];
    }),
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function timestampDate(value: unknown): Date | undefined {
  if (value instanceof Timestamp) return value.toDate();
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }
  return value instanceof Date ? value : undefined;
}
