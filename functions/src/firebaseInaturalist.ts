import {
  FieldValue,
  Firestore,
  Timestamp,
} from 'firebase-admin/firestore';

import {
  CatalogImport,
  ImportRepository,
  ObservationImport,
  SyncRunSummary,
  UpsertCounts,
} from './inaturalist';

const OBSERVATIONS = 'inaturalist-observations';
const CATALOG = 'inaturalist-guide-profiles';
const LOCAL_CATALOG = 'catalog';
const STATE = 'integration-state';
const STATE_ID = 'inaturalist';
const WRITE_BATCH_SIZE = 400;

export type ImportedRecordKind = 'observation' | 'catalog';

export class FirebaseInaturalistRepository implements ImportRepository {
  constructor(private readonly firestore: Firestore) {}

  async acquireLease(
    runId: string,
    now: Date,
    leaseUntil: Date,
  ): Promise<boolean> {
    const reference = this.firestore.collection(STATE).doc(STATE_ID);
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
    const reference = this.firestore.collection(STATE).doc(STATE_ID);
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
    const snapshot = await this.firestore
      .collection(CATALOG)
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
    const snapshot = await this.firestore.collection(LOCAL_CATALOG).get();
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
        this.firestore.collection(OBSERVATIONS).doc(String(id)),
      );
      const existing = await this.firestore.getAll(...references);
      const batch = this.firestore.batch();
      valuesChunk.forEach((value, index) => {
        const prior = existing[index];
        if (prior.exists) updated += 1;
        else created += 1;
        const priorData = prior.data();
        const moderation = moderationValue(priorData?.moderation);
        batch.set(references[index], {
          ...serializeObservation(value),
          importedAt:
            priorData?.importedAt ?? Timestamp.fromDate(value.importedAt),
          moderation: serializeModeration(moderation),
          visible: value.sourceActive && !moderation.hidden,
        });
      });
      await batch.commit();
    }
    return { created, updated };
  }

  async upsertCatalog(values: readonly CatalogImport[]): Promise<UpsertCounts> {
    let created = 0;
    let updated = 0;
    for (const valuesChunk of chunks(values, WRITE_BATCH_SIZE)) {
      const references = valuesChunk.map(({ id }) =>
        this.firestore.collection(CATALOG).doc(String(id)),
      );
      const existing = await this.firestore.getAll(...references);
      const batch = this.firestore.batch();
      valuesChunk.forEach((value, index) => {
        const prior = existing[index];
        if (prior.exists) updated += 1;
        else created += 1;
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
        batch.set(references[index], document);
      });
      await batch.commit();
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
    const reference = this.firestore.collection(STATE).doc(STATE_ID);
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
    const reference = this.firestore
      .collection(kind === 'observation' ? OBSERVATIONS : CATALOG)
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
    const reference = this.firestore.collection(CATALOG).doc(String(id));
    const snapshot = await reference.get();
    if (!snapshot.exists) throw new Error('Imported catalog profile not found');
    await reference.update({ overrides });
  }

  async linkCatalog(id: number, localCatalogId?: string): Promise<void> {
    const reference = this.firestore.collection(CATALOG).doc(String(id));
    if (localCatalogId) {
      const local = await this.firestore
        .collection(LOCAL_CATALOG)
        .doc(localCatalogId)
        .get();
      if (!local.exists) throw new Error('Local catalog profile not found');
    }
    const imported = await reference.get();
    if (!imported.exists) throw new Error('Imported catalog profile not found');
    await reference.update({
      linkedLocalCatalogId: localCatalogId ?? FieldValue.delete(),
      matchStatus: localCatalogId ? 'linked' : 'unlinked',
    });
  }

  private async deactivateMissing(
    collection: string,
    seen: ReadonlySet<number>,
    now: Date,
  ): Promise<number> {
    const snapshot = await this.firestore
      .collection(collection)
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
}

function serializeObservation(value: ObservationImport) {
  const { id: _id, ...stored } = value;
  return {
    ...stored,
    sourceUpdatedAt: Timestamp.fromDate(value.sourceUpdatedAt),
    observedAt: Timestamp.fromDate(value.observedAt),
    importedAt: Timestamp.fromDate(value.importedAt),
    syncedAt: Timestamp.fromDate(value.syncedAt),
    moderation: serializeModeration(value.moderation),
  };
}

function serializeCatalog(value: CatalogImport) {
  const { id: _id, linkedLocalCatalogId: _linked, ...stored } = value;
  return {
    ...stored,
    sourceUpdatedAt: Timestamp.fromDate(value.sourceUpdatedAt),
    importedAt: Timestamp.fromDate(value.importedAt),
    syncedAt: Timestamp.fromDate(value.syncedAt),
    moderation: serializeModeration(value.moderation),
  };
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
