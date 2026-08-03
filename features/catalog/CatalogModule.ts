import {
  COLLECTIONS,
  CatalogEntry,
  Cat,
  Clock,
  FirestoreCodec,
  IdGenerator,
  Outcome,
  User,
  canManageFeature,
  failure,
  parseCatalogEntry,
  success,
} from '../../core/domain';
import { MediaCoordinator, MediaSelection, localMedia } from '../../core/media';
import { DocumentStore, MediaStore, StoredMediaAsset } from '../../core/ports';

export interface CatalogDraft {
  readonly cat: Cat;
  readonly credits: string;
  readonly photos: readonly string[];
}

export interface CatalogUpdate {
  readonly cat: Cat;
  readonly credits: string;
  readonly profile: MediaSelection;
  readonly gallery: readonly MediaSelection[];
}

interface CatalogDependencies {
  readonly documents: DocumentStore;
  readonly media: MediaStore;
  readonly mediaCoordinator: MediaCoordinator;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly codecs: { readonly catalog: FirestoreCodec<CatalogEntry> };
}

export class CatalogModule {
  constructor(private readonly dependencies: CatalogDependencies) {}

  async list(): Promise<Outcome<readonly CatalogEntry[]>> {
    try {
      const documents = await this.dependencies.documents.list(COLLECTIONS.catalog);
      return success(
        documents.map(({ id, data }) =>
          this.dependencies.codecs.catalog.decode(id, data),
        ),
      );
    } catch {
      return failure('dependency_failure', 'Could not load the catalog');
    }
  }

  async get(id: string): Promise<Outcome<CatalogEntry>> {
    try {
      const document = await this.dependencies.documents.get(COLLECTIONS.catalog, id);
      return document
        ? success(this.dependencies.codecs.catalog.decode(document.id, document.data))
        : failure('not_found', 'Catalog entry not found');
    } catch {
      return failure('dependency_failure', 'Could not load the catalog entry');
    }
  }

  async media(id: string): Promise<Outcome<readonly StoredMediaAsset[]>> {
    try {
      return success(await this.dependencies.media.list(`${COLLECTIONS.catalog}/${id}`));
    } catch {
      return failure('dependency_failure', 'Could not load catalog media');
    }
  }

  async create(actor: User | undefined, draft: CatalogDraft): Promise<Outcome<CatalogEntry>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const validation = validateCatalog(draft.cat, draft.photos.length);
    if (validation) return failure('validation', validation);

    const id = this.dependencies.ids.next();
    const entry = parseCatalogEntry({
      id,
      cat: draft.cat,
      credits: draft.credits,
      createdAt: this.dependencies.clock.now(),
      createdBy: actor,
    });
    const mediaResult = await this.dependencies.mediaCoordinator.reconcile({
      folder: `${COLLECTIONS.catalog}/${id}`,
      profile: localMedia(draft.photos[0]),
      gallery: draft.photos.slice(1).map(localMedia),
      persist: async () =>
        this.dependencies.documents.put(
          COLLECTIONS.catalog,
          id,
          this.dependencies.codecs.catalog.encode(entry),
        ),
    });
    return mediaResult.ok ? success(entry, mediaResult.warnings) : mediaResult;
  }

  async update(
    actor: User | undefined,
    id: string,
    update: CatalogUpdate,
  ): Promise<Outcome<CatalogEntry>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const existing = await this.get(id);
    if (!existing.ok) return existing;
    const validation = validateCatalog(update.cat, 1);
    if (validation) return failure('validation', validation);

    const entry = parseCatalogEntry({
      id,
      cat: update.cat,
      credits: update.credits,
      createdAt: this.dependencies.clock.now(),
      createdBy: actor,
    });
    const mediaResult = await this.dependencies.mediaCoordinator.reconcile({
      folder: `${COLLECTIONS.catalog}/${id}`,
      profile: update.profile,
      gallery: update.gallery,
      persist: async () =>
        this.dependencies.documents.put(
          COLLECTIONS.catalog,
          id,
          this.dependencies.codecs.catalog.encode(entry),
        ),
    });
    return mediaResult.ok ? success(entry, mediaResult.warnings) : mediaResult;
  }

  async remove(actor: User | undefined, id: string): Promise<Outcome<void>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const existing = await this.get(id);
    if (!existing.ok) return existing;

    try {
      await this.dependencies.documents.remove(COLLECTIONS.catalog, id);
    } catch {
      return failure('dependency_failure', 'Could not delete the catalog entry');
    }

    try {
      const assets = await this.dependencies.media.list(`${COLLECTIONS.catalog}/${id}`);
      const cleanup = await Promise.allSettled(
        assets.map(({ id: mediaId }) => this.dependencies.media.remove(mediaId)),
      );
      return success(
        undefined,
        cleanup.some(({ status }) => status === 'rejected')
          ? [
              {
                code: 'cleanup_failed',
                message: 'The catalog entry was deleted, but some media remains',
              },
            ]
          : [],
      );
    } catch {
      return success(undefined, [
        {
          code: 'cleanup_failed',
          message: 'The catalog entry was deleted, but some media remains',
        },
      ]);
    }
  }
}

function mutationDenied(actor: User | undefined): Outcome<never> | undefined {
  if (!actor) return failure('unauthenticated', 'Sign in to manage the catalog');
  if (!canManageFeature(actor.role)) {
    return failure('forbidden', 'Only administrators may manage the catalog');
  }
  return undefined;
}

const requiredCatFields: readonly [keyof Cat, string][] = [
  ['name', 'Name'],
  ['descShort', 'Short Description'],
  ['descLong', 'Long Description'],
  ['colorPattern', 'Color pattern'],
  ['yearsRecorded', 'Years recorded'],
  ['AoR', 'Area of residence'],
  ['furPattern', 'Fur pattern'],
];

function validateCatalog(cat: Cat, photoCount: number): string | undefined {
  for (const [key, label] of requiredCatFields) {
    const value = cat[key];
    if (typeof value !== 'string' || !value.trim()) {
      return `${label} field must not be empty`;
    }
  }
  return photoCount === 0 ? 'Please select a photo.' : undefined;
}
