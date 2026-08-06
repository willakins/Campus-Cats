import {
  Clock,
  COLLECTIONS,
  PersistenceCodec,
  ImportedObservation,
  IdGenerator,
  LocalSightingRecord,
  Outcome,
  Sighting,
  SightingRecord,
  User,
  canModifySighting,
  failure,
  importedSightingRecord,
  localSightingRecord,
  parseSighting,
  success,
} from '../../core/domain';
import {
  MediaCoordinator,
  MediaSelection,
  localMedia,
} from '../../core/media';
import {
  DisplayMediaAsset,
  DocumentStore,
  InaturalistReader,
  MediaStore,
} from '../../core/ports';
import { ContentContributors } from '../appSettings';

export interface SightingDraft {
  readonly name: string;
  readonly info: string;
  readonly fed: boolean;
  readonly health: boolean;
  readonly date: Date;
  readonly location: { readonly latitude: number; readonly longitude: number };
  readonly timeOfDay: string;
  readonly photos: readonly string[];
}

export interface SightingUpdate
  extends Omit<SightingDraft, 'photos'> {
  readonly profile: MediaSelection;
  readonly gallery: readonly MediaSelection[];
}

interface SightingsDependencies {
  readonly documents: DocumentStore;
  readonly media: MediaStore;
  readonly mediaCoordinator: MediaCoordinator;
  readonly ids: IdGenerator;
  readonly contributors: ContentContributors;
  readonly codecs: { readonly sighting: PersistenceCodec<Sighting> };
  readonly imports?: {
    readonly reader: InaturalistReader;
    readonly codec: PersistenceCodec<ImportedObservation>;
  };
}

export class SightingsModule {
  constructor(private readonly dependencies: SightingsDependencies) {}

  async list(actor?: User): Promise<Outcome<readonly SightingRecord[]>> {
    let local: readonly SightingRecord[];
    try {
      const canViewContributors = await this.dependencies.contributors.canView(actor);
      const [documents, contributors] = await Promise.all([
        this.dependencies.documents.list(COLLECTIONS.sightings),
        canViewContributors
          ? this.dependencies.contributors.visibleByContentId(actor, 'sighting')
          : Promise.resolve(new Map<string, User>()),
      ]);
      local = documents.map(({ id, data }) => {
        const decoded = this.dependencies.codecs.sighting.decode(id, data);
        return localSightingRecord(
          withSightingContributor(
            decoded,
            canViewContributors
              ? contributors.get(id) ?? decoded.createdBy
              : undefined,
          ),
        );
      });
    } catch {
      return failure('dependency_failure', 'Could not load sightings');
    }

    if (!this.dependencies.imports) return success(local);
    try {
      const imported = await this.dependencies.imports.reader.listObservations(
        false,
      );
      const importedRecords: SightingRecord[] = [];
      let invalidImportedCount = 0;

      for (const { id, data } of imported) {
        try {
          importedRecords.push(
            importedSightingRecord(
              this.dependencies.imports.codec.decode(id, data),
            ),
          );
        } catch {
          invalidImportedCount += 1;
        }
      }

      const warnings =
        invalidImportedCount > 0
          ? [
              {
                code: 'partial_completion' as const,
                message: `${invalidImportedCount} invalid iNaturalist ${
                  invalidImportedCount === 1 ? 'sighting was' : 'sightings were'
                } skipped`,
              },
            ]
          : [];

      return success([...local, ...importedRecords], warnings);
    } catch {
      return success(local, [
        {
          code: 'partial_completion',
          message:
            'Campus Cats reports loaded, but iNaturalist sightings are unavailable',
        },
      ]);
    }
  }

  async listByReporter(
    actorOrUserId: User | string | undefined,
    requestedUserId?: string,
  ): Promise<Outcome<readonly LocalSightingRecord[]>> {
    const actor = typeof actorOrUserId === 'string' ? undefined : actorOrUserId;
    const userId = typeof actorOrUserId === 'string' ? actorOrUserId : requestedUserId;
    if (!userId) return failure('validation', 'Missing member profile ID');
    try {
      const mayView = actor?.id === userId || await this.dependencies.contributors.canView(actor);
      if (!mayView) return success([]);
      const [ids, legacyDocuments] = await Promise.all([
        this.dependencies.contributors.contentIdsForUser(
          actor,
          'sighting',
          userId,
        ),
        this.dependencies.documents.listWhereEqual(
          COLLECTIONS.sightings,
          'createdBy.id',
          userId,
        ),
      ]);
      const migratedDocuments = await Promise.all(
        ids.map((id) => this.dependencies.documents.get(COLLECTIONS.sightings, id)),
      );
      const byId = new Map(
        [...legacyDocuments, ...migratedDocuments.filter((document) => document !== undefined)]
          .map((document) => [document.id, document]),
      );
      return success(
        [...byId.values()]
          .map(({ id, data }) =>
            localSightingRecord(
              withSightingContributor(
                this.dependencies.codecs.sighting.decode(id, data),
                actor?.id === userId ? actor : undefined,
              ),
            ),
          )
          .sort((left, right) => right.date.getTime() - left.date.getTime()),
      );
    } catch {
      return failure(
        'dependency_failure',
        'Could not load the member sightings',
      );
    }
  }

  async get(
    actorOrId: User | string | undefined,
    requestedId?: string,
  ): Promise<Outcome<SightingRecord>> {
    const actor = typeof actorOrId === 'string' ? undefined : actorOrId;
    const id = typeof actorOrId === 'string' ? actorOrId : requestedId;
    if (!id) return failure('validation', 'Missing sighting ID');
    const importedId = importedObservationId(id);
    if (importedId !== undefined) {
      if (!this.dependencies.imports) {
        return failure('not_found', 'Sighting not found');
      }
      try {
        const document =
          await this.dependencies.imports.reader.getObservation(importedId);
        return document
          ? success(
              importedSightingRecord(
                this.dependencies.imports.codec.decode(
                  document.id,
                  document.data,
                ),
              ),
            )
          : failure('not_found', 'Sighting not found');
      } catch {
        return failure('dependency_failure', 'Could not load the sighting');
      }
    }
    try {
      const document = await this.dependencies.documents.get(
        COLLECTIONS.sightings,
        id,
      );
      if (!document) return failure('not_found', 'Sighting not found');
      const decoded = this.dependencies.codecs.sighting.decode(
        document.id,
        document.data,
      );
      const canViewContributors = await this.dependencies.contributors.canView(actor);
      const contributor = await this.dependencies.contributors.visibleForContent(
        actor,
        'sighting',
        id,
      );
      const legacyContributor =
        canViewContributors || decoded.createdBy?.id === actor?.id
          ? decoded.createdBy
          : undefined;
      return success(
        localSightingRecord(
          withSightingContributor(decoded, contributor ?? legacyContributor),
        ),
      );
    } catch {
      return failure('dependency_failure', 'Could not load the sighting');
    }
  }

  async media(id: string): Promise<Outcome<readonly DisplayMediaAsset[]>> {
    const importedId = importedObservationId(id);
    if (importedId !== undefined) {
      if (!this.dependencies.imports) return success([]);
      try {
        const document =
          await this.dependencies.imports.reader.getObservation(importedId);
        return document
          ? success(
              this.dependencies.imports.codec.decode(
                document.id,
                document.data,
              ).photos,
            )
          : failure('not_found', 'Sighting not found');
      } catch {
        return failure('dependency_failure', 'Could not load sighting media');
      }
    }
    try {
      return success(
        await this.dependencies.media.list(`${COLLECTIONS.sightings}/${id}`),
      );
    } catch {
      return failure('dependency_failure', 'Could not load sighting media');
    }
  }

  async create(
    actor: User | undefined,
    draft: SightingDraft,
  ): Promise<Outcome<Sighting>> {
    if (!actor) {
      return failure('unauthenticated', 'Sign in to create a sighting');
    }
    const validation = validateDraft(draft, draft.photos.length);
    if (validation) {
      return failure('validation', validation);
    }

    const id = this.dependencies.ids.next();
    const sighting = parseSighting({ id, ...draft, createdBy: actor });
    const mediaResult = await this.dependencies.mediaCoordinator.reconcile({
      folder: `${COLLECTIONS.sightings}/${id}`,
      ownerId: actor.id,
      profile: localMedia(draft.photos[0]),
      gallery: draft.photos.slice(1).map(localMedia),
      persist: async () =>
        this.dependencies.documents.commit([
          {
            operation: 'put',
            collection: COLLECTIONS.sightings,
            id,
            data: this.dependencies.codecs.sighting.encode(sighting),
          },
          this.dependencies.contributors.write('sighting', id, actor),
        ]),
    });
    return mediaResult.ok
      ? success(sighting, mediaResult.warnings)
      : mediaResult;
  }

  async update(
    actor: User | undefined,
    id: string,
    update: SightingUpdate,
  ): Promise<Outcome<Sighting>> {
    if (!actor) {
      return failure('unauthenticated', 'Sign in to update a sighting');
    }
    if (importedObservationId(id) !== undefined) {
      return failure(
        'forbidden',
        'iNaturalist sightings are read-only in Campus Cats',
      );
    }
    const existingResult = await this.get(actor, id);
    if (!existingResult.ok) {
      return existingResult;
    }
    if (existingResult.value.source !== 'campus-cats') {
      return failure(
        'forbidden',
        'iNaturalist sightings are read-only in Campus Cats',
      );
    }
    if (!existingResult.value.createdBy || !canModifySighting(actor.id, existingResult.value.createdBy.id)) {
      return failure('forbidden', 'Only the creator may update this sighting');
    }
    const validation = validateDraft(update, 1);
    if (validation) {
      return failure('validation', validation);
    }

    const sighting = parseSighting({
      id,
      ...update,
      createdBy: existingResult.value.createdBy,
    });
    const mediaResult = await this.dependencies.mediaCoordinator.reconcile({
      folder: `${COLLECTIONS.sightings}/${id}`,
      ownerId: actor.id,
      profile: update.profile,
      gallery: update.gallery,
      persist: async () =>
        this.dependencies.documents.put(
          COLLECTIONS.sightings,
          id,
          this.dependencies.codecs.sighting.encode(sighting),
        ),
    });
    return mediaResult.ok
      ? success(sighting, mediaResult.warnings)
      : mediaResult;
  }

  async remove(
    actor: User | undefined,
    id: string,
  ): Promise<Outcome<void>> {
    if (!actor) {
      return failure('unauthenticated', 'Sign in to delete a sighting');
    }
    if (importedObservationId(id) !== undefined) {
      return failure(
        'forbidden',
        'iNaturalist sightings cannot be deleted from Campus Cats',
      );
    }
    const existingResult = await this.get(actor, id);
    if (!existingResult.ok) {
      return existingResult;
    }
    if (existingResult.value.source !== 'campus-cats') {
      return failure(
        'forbidden',
        'iNaturalist sightings cannot be deleted from Campus Cats',
      );
    }
    if (!existingResult.value.createdBy || !canModifySighting(actor.id, existingResult.value.createdBy.id)) {
      return failure('forbidden', 'Only the creator may delete this sighting');
    }

    try {
      const assets = await this.dependencies.media.list(
        `${COLLECTIONS.sightings}/${id}`,
      );
      const cleanup = await Promise.allSettled(
        assets.map(({ id: mediaId }) => this.dependencies.media.remove(mediaId)),
      );
      const cleanupFailed = cleanup.some(({ status }) => status === 'rejected');
      if (cleanupFailed) {
        return failure(
          'partial_failure',
          'Some sighting media could not be removed; the record was preserved',
        );
      }
    } catch {
      return failure(
        'dependency_failure',
        'Could not load sighting media for deletion',
      );
    }

    try {
      await this.dependencies.documents.commit([
        { operation: 'remove', collection: COLLECTIONS.sightings, id },
        this.dependencies.contributors.remove('sighting', id),
      ]);
      return success(undefined);
    } catch {
      return failure(
        'partial_failure',
        'Sighting media was removed, but the record could not be deleted',
      );
    }
  }
}

function withSightingContributor(
  sighting: Sighting,
  createdBy: User | undefined,
): Sighting {
  const { createdBy: _legacyContributor, ...value } = sighting;
  return parseSighting({ ...value, createdBy });
}

function importedObservationId(id: string): number | undefined {
  const match = /^inat-observation-(\d+)$/.exec(id);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function validateDraft(
  draft: Omit<SightingDraft, 'photos'>,
  photoCount: number,
): string | undefined {
  if (!draft.name.trim()) {
    return 'Please enter a name for the cat.';
  }
  if (
    !Number.isFinite(draft.location.latitude) ||
    !Number.isFinite(draft.location.longitude) ||
    draft.location.latitude === 0 ||
    draft.location.longitude === 0
  ) {
    return 'Please select a location on the map.';
  }
  if (!draft.timeOfDay) {
    return 'Please select a time of day for the sighting.';
  }
  if (photoCount === 0) {
    return 'Please select a photo.';
  }
  return undefined;
}

export function filterSightingsByAge<T extends { readonly date: Date }>(
  sightings: readonly T[],
  days: number | undefined,
  clock: Clock,
): readonly T[] {
  if (days === undefined) {
    return sightings;
  }
  const cutoff = clock.now().getTime() - days * 24 * 60 * 60 * 1000;
  return sightings.filter(({ date }) => date.getTime() >= cutoff);
}
