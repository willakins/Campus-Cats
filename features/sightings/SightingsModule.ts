import {
  Clock,
  COLLECTIONS,
  FirestoreCodec,
  ImportedObservation,
  IdGenerator,
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
  readonly codecs: { readonly sighting: FirestoreCodec<Sighting> };
  readonly imports?: {
    readonly reader: InaturalistReader;
    readonly codec: FirestoreCodec<ImportedObservation>;
  };
}

export class SightingsModule {
  constructor(private readonly dependencies: SightingsDependencies) {}

  async list(): Promise<Outcome<readonly SightingRecord[]>> {
    let local: readonly SightingRecord[];
    try {
      const documents = await this.dependencies.documents.list(
        COLLECTIONS.sightings,
      );
      local = documents.map(({ id, data }) =>
        localSightingRecord(
          this.dependencies.codecs.sighting.decode(id, data),
        ),
      );
    } catch {
      return failure('dependency_failure', 'Could not load sightings');
    }

    if (!this.dependencies.imports) return success(local);
    try {
      const imported = await this.dependencies.imports.reader.listObservations(
        false,
      );
      return success([
        ...local,
        ...imported.map(({ id, data }) =>
          importedSightingRecord(
            this.dependencies.imports!.codec.decode(id, data),
          ),
        ),
      ]);
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

  async get(id: string): Promise<Outcome<SightingRecord>> {
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
      return document
        ? success(
            localSightingRecord(
              this.dependencies.codecs.sighting.decode(
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
    const existingResult = await this.get(id);
    if (!existingResult.ok) {
      return existingResult;
    }
    if (existingResult.value.source !== 'campus-cats') {
      return failure(
        'forbidden',
        'iNaturalist sightings are read-only in Campus Cats',
      );
    }
    if (!canModifySighting(actor.id, existingResult.value.createdBy.id)) {
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
    const existingResult = await this.get(id);
    if (!existingResult.ok) {
      return existingResult;
    }
    if (existingResult.value.source !== 'campus-cats') {
      return failure(
        'forbidden',
        'iNaturalist sightings cannot be deleted from Campus Cats',
      );
    }
    if (!canModifySighting(actor.id, existingResult.value.createdBy.id)) {
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
      await this.dependencies.documents.remove(COLLECTIONS.sightings, id);
      return success(undefined);
    } catch {
      return failure(
        'partial_failure',
        'Sighting media was removed, but the record could not be deleted',
      );
    }
  }
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
