import {
  COLLECTIONS,
  Clock,
  FirestoreCodec,
  IdGenerator,
  Outcome,
  Station,
  StationStockStatus,
  User,
  calculateStationStockStatus,
  canManageFeature,
  failure,
  parseStation,
  success,
} from '../../core/domain';
import { MediaCoordinator, MediaSelection, localMedia } from '../../core/media';
import { DocumentStore, MediaStore, StoredMediaAsset } from '../../core/ports';

export interface StationDraft {
  readonly name: string;
  readonly location: { readonly latitude: number; readonly longitude: number };
  readonly lastStocked: Date;
  readonly stockingFreq: number;
  readonly knownCats: string;
  readonly photos: readonly string[];
}

export interface StationUpdate extends Omit<StationDraft, 'photos'> {
  readonly profile: MediaSelection;
  readonly gallery: readonly MediaSelection[];
}

interface StationsDependencies {
  readonly documents: DocumentStore;
  readonly media: MediaStore;
  readonly mediaCoordinator: MediaCoordinator;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly codecs: { readonly station: FirestoreCodec<Station> };
}

export class StationsModule {
  constructor(private readonly dependencies: StationsDependencies) {}

  stockStatus(station: Station): StationStockStatus {
    return calculateStationStockStatus(
      station.lastStocked,
      station.stockingFreq,
      this.dependencies.clock,
    );
  }

  async list(): Promise<Outcome<readonly Station[]>> {
    try {
      const documents = await this.dependencies.documents.list(COLLECTIONS.stations);
      return success(
        documents.map(({ id, data }) =>
          this.dependencies.codecs.station.decode(id, data),
        ),
      );
    } catch {
      return failure('dependency_failure', 'Could not load feeding stations');
    }
  }

  async get(id: string): Promise<Outcome<Station>> {
    try {
      const document = await this.dependencies.documents.get(COLLECTIONS.stations, id);
      return document
        ? success(this.dependencies.codecs.station.decode(document.id, document.data))
        : failure('not_found', 'Feeding station not found');
    } catch {
      return failure('dependency_failure', 'Could not load the feeding station');
    }
  }

  async media(id: string): Promise<Outcome<readonly StoredMediaAsset[]>> {
    try {
      return success(await this.dependencies.media.list(`${COLLECTIONS.stations}/${id}`));
    } catch {
      return failure('dependency_failure', 'Could not load station media');
    }
  }

  async create(actor: User | undefined, draft: StationDraft): Promise<Outcome<Station>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const validation = validateStation(draft, draft.photos.length);
    if (validation) return failure('validation', validation);

    const id = this.dependencies.ids.next();
    const station = parseStation({ id, ...draft, createdBy: actor });
    const mediaResult = await this.dependencies.mediaCoordinator.reconcile({
      folder: `${COLLECTIONS.stations}/${id}`,
      profile: localMedia(draft.photos[0]),
      gallery: draft.photos.slice(1).map(localMedia),
      persist: async () =>
        this.dependencies.documents.put(
          COLLECTIONS.stations,
          id,
          this.dependencies.codecs.station.encode(station),
        ),
    });
    return mediaResult.ok ? success(station, mediaResult.warnings) : mediaResult;
  }

  async update(
    actor: User | undefined,
    id: string,
    update: StationUpdate,
  ): Promise<Outcome<Station>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const existing = await this.get(id);
    if (!existing.ok) return existing;
    const validation = validateStation(update, 1);
    if (validation) return failure('validation', validation);

    const station = parseStation({ id, ...update, createdBy: actor });
    const mediaResult = await this.dependencies.mediaCoordinator.reconcile({
      folder: `${COLLECTIONS.stations}/${id}`,
      profile: update.profile,
      gallery: update.gallery,
      persist: async () =>
        this.dependencies.documents.put(
          COLLECTIONS.stations,
          id,
          this.dependencies.codecs.station.encode(station),
        ),
    });
    return mediaResult.ok ? success(station, mediaResult.warnings) : mediaResult;
  }

  async restock(actor: User | undefined, id: string): Promise<Outcome<Station>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const existing = await this.get(id);
    if (!existing.ok) return existing;
    const station = parseStation({
      ...existing.value,
      lastStocked: this.dependencies.clock.now(),
    });
    try {
      await this.dependencies.documents.put(
        COLLECTIONS.stations,
        id,
        this.dependencies.codecs.station.encode(station),
      );
      return success(station);
    } catch {
      return failure('dependency_failure', 'Could not restock the feeding station');
    }
  }

  async remove(actor: User | undefined, id: string): Promise<Outcome<void>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const existing = await this.get(id);
    if (!existing.ok) return existing;
    try {
      await this.dependencies.documents.remove(COLLECTIONS.stations, id);
    } catch {
      return failure('dependency_failure', 'Could not delete the feeding station');
    }
    try {
      const assets = await this.dependencies.media.list(`${COLLECTIONS.stations}/${id}`);
      const cleanup = await Promise.allSettled(
        assets.map(({ id: mediaId }) => this.dependencies.media.remove(mediaId)),
      );
      return success(
        undefined,
        cleanup.some(({ status }) => status === 'rejected')
          ? [
              {
                code: 'cleanup_failed',
                message: 'The station was deleted, but some media remains',
              },
            ]
          : [],
      );
    } catch {
      return success(undefined, [
        {
          code: 'cleanup_failed',
          message: 'The station was deleted, but some media remains',
        },
      ]);
    }
  }
}

function mutationDenied(actor: User | undefined): Outcome<never> | undefined {
  if (!actor) return failure('unauthenticated', 'Sign in to manage feeding stations');
  if (!canManageFeature(actor.role)) {
    return failure('forbidden', 'Only officers may manage feeding stations');
  }
  return undefined;
}

function validateStation(
  station: Omit<StationDraft, 'photos'>,
  photoCount: number,
): string | undefined {
  if (!station.name.trim()) return 'Name field must not be empty';
  if (Number.isNaN(station.lastStocked.getTime())) return 'Last Stocked date is invalid';
  if (photoCount === 0) return 'Please select a photo.';
  if (
    !Number.isFinite(station.location.latitude) ||
    !Number.isFinite(station.location.longitude) ||
    station.location.latitude === 0 ||
    station.location.longitude === 0
  ) {
    return 'Please select a location on the map';
  }
  if (!Number.isFinite(station.stockingFreq) || station.stockingFreq <= 0) {
    return 'Stocking Frequency must be a positive number';
  }
  return undefined;
}
