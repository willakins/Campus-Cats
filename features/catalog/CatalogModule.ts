import {
  COLLECTIONS,
  CatalogEntry,
  CatalogFavorite,
  CatalogRecord,
  CatalogTagAssignment,
  Cat,
  Clock,
  PersistenceCodec,
  ImportedCatalogProfile,
  IdGenerator,
  Outcome,
  User,
  canManageFeature,
  failure,
  importedCatalogMedia,
  localCatalogRecord,
  parseCatalogEntry,
  parseCatalogFavorite,
  parseCatalogTagAssignment,
  success,
} from '../../core/domain';
import { MediaCoordinator, MediaSelection, localMedia } from '../../core/media';
import {
  DisplayMediaAsset,
  DocumentStore,
  InaturalistReader,
  MediaStore,
} from '../../core/ports';
import { CatalogFavoriteSummary } from './catalogDiscovery';
import { ContentContributors } from '../appSettings';

export interface CatalogDraft {
  readonly cat: Cat;
  readonly credits: string;
  readonly photos: readonly string[];
  readonly tagIds?: readonly string[];
}

export interface CatalogUpdate {
  readonly cat: Cat;
  readonly credits: string;
  readonly profile: MediaSelection;
  readonly gallery: readonly MediaSelection[];
  readonly tagIds?: readonly string[];
}

interface CatalogDependencies {
  readonly documents: DocumentStore;
  readonly media: MediaStore;
  readonly mediaCoordinator: MediaCoordinator;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly contributors: ContentContributors;
  readonly codecs: {
    readonly catalog: PersistenceCodec<CatalogEntry>;
    readonly catalogFavorite: PersistenceCodec<CatalogFavorite>;
    readonly catalogTagAssignment: PersistenceCodec<CatalogTagAssignment>;
  };
  readonly imports?: {
    readonly reader: InaturalistReader;
    readonly codec: PersistenceCodec<ImportedCatalogProfile>;
  };
}

export class CatalogModule {
  constructor(private readonly dependencies: CatalogDependencies) {}

  async list(actor?: User): Promise<Outcome<readonly CatalogRecord[]>> {
    const [localAttempt, importedAttempt, contributorAttempt] = await Promise.allSettled([
      this.dependencies.documents.list(COLLECTIONS.catalog),
      this.dependencies.imports
        ? this.dependencies.imports.reader.listCatalog(false)
        : Promise.resolve(undefined),
      this.dependencies.contributors.visibleByContentId(actor, 'catalog'),
    ]);
    if (localAttempt.status === 'rejected') {
      return failure('dependency_failure', 'Could not load the catalog');
    }

    let localEntries: readonly CatalogEntry[];
    try {
      const contributors = contributorAttempt.status === 'fulfilled'
        ? contributorAttempt.value
        : new Map<string, User>();
      const canViewContributors = await this.dependencies.contributors.canView(actor);
      localEntries = localAttempt.value.map(({ id, data }) => {
        const decoded = this.dependencies.codecs.catalog.decode(id, data);
        return withCatalogContributor(
          decoded,
          canViewContributors ? contributors.get(id) ?? decoded.createdBy : undefined,
        );
      });
    } catch {
      return failure('dependency_failure', 'Could not load the catalog');
    }

    if (!this.dependencies.imports) {
      return success(localEntries.map(localCatalogRecord));
    }
    if (importedAttempt.status === 'rejected' || !importedAttempt.value) {
      return success(localEntries.map(localCatalogRecord), [
        {
          code: 'partial_completion',
          message:
            'Local catalog profiles loaded, but iNaturalist profiles are unavailable',
        },
      ]);
    }
    try {
      const profiles = importedAttempt.value.map(({ id, data }) =>
        this.dependencies.imports!.codec.decode(id, data),
      );
      const linkedLocalIds = new Set(
        profiles.flatMap(({ linkedLocalCatalogId }) =>
          linkedLocalCatalogId ? [linkedLocalCatalogId] : [],
        ),
      );
      const localById = new Map<string, CatalogEntry>(
        localEntries.map((entry) => [entry.id, entry]),
      );
      const records: CatalogRecord[] = [
        ...localEntries
          .filter(({ id }) => !linkedLocalIds.has(id))
          .map(localCatalogRecord),
        ...profiles.map((profile) =>
          importedCatalogRecord(
            profile,
            profile.linkedLocalCatalogId
              ? localById.get(profile.linkedLocalCatalogId)
              : undefined,
          ),
        ),
      ];
      return success(
        records.sort((left, right) =>
          left.cat.name.localeCompare(right.cat.name),
        ),
      );
    } catch {
      return success(localEntries.map(localCatalogRecord), [
        {
          code: 'partial_completion',
          message:
            'Local catalog profiles loaded, but iNaturalist profiles are unavailable',
        },
      ]);
    }
  }

  async favoriteSummary(
    actor: User | undefined,
  ): Promise<Outcome<CatalogFavoriteSummary>> {
    if (!actor) {
      return failure('unauthenticated', 'Sign in to view catalog favorites');
    }

    try {
      const documents = await this.dependencies.documents.list(
        COLLECTIONS.catalogFavorites,
      );
      const counts: Record<string, number> = {};
      let selectedCatalogId: string | undefined;
      let invalidCount = 0;

      for (const document of documents) {
        try {
          const favorite = this.dependencies.codecs.catalogFavorite.decode(
            document.id,
            document.data,
          );
          counts[favorite.catalogId] = (counts[favorite.catalogId] ?? 0) + 1;
          if (favorite.userId === actor.id) {
            selectedCatalogId = favorite.catalogId;
          }
        } catch {
          invalidCount += 1;
        }
      }

      return success(
        { selectedCatalogId, counts },
        invalidCount > 0
          ? [
              {
                code: 'partial_completion',
                message: `${invalidCount} invalid favorite ${invalidCount === 1 ? 'record was' : 'records were'} ignored`,
              },
            ]
          : [],
      );
    } catch {
      return failure('dependency_failure', 'Could not load catalog favorites');
    }
  }

  async favoriteForUser(
    userId: string,
  ): Promise<Outcome<CatalogFavorite | undefined>> {
    try {
      const document = await this.dependencies.documents.get(
        COLLECTIONS.catalogFavorites,
        userId,
      );
      return success(
        document
          ? this.dependencies.codecs.catalogFavorite.decode(
              document.id,
              document.data,
            )
          : undefined,
      );
    } catch {
      return failure('dependency_failure', 'Could not load the favorite cat');
    }
  }

  async setFavorite(
    actor: User | undefined,
    catalogId: string | undefined,
  ): Promise<Outcome<CatalogFavorite | undefined>> {
    if (!actor) {
      return failure('unauthenticated', 'Sign in to choose a favorite cat');
    }
    if (catalogId !== undefined && !catalogId.trim()) {
      return failure('validation', 'Choose a valid catalog profile');
    }

    try {
      if (catalogId === undefined) {
        await this.dependencies.documents.remove(
          COLLECTIONS.catalogFavorites,
          actor.id,
        );
        return success(undefined);
      }

      const favorite = parseCatalogFavorite({
        userId: actor.id,
        catalogId: catalogId.trim(),
        createdAt: this.dependencies.clock.now(),
      });
      await this.dependencies.documents.put(
        COLLECTIONS.catalogFavorites,
        actor.id,
        this.dependencies.codecs.catalogFavorite.encode(favorite),
      );
      return success(favorite);
    } catch {
      return failure('dependency_failure', 'Could not update your favorite cat');
    }
  }

  async get(
    actorOrId: User | string | undefined,
    requestedId?: string,
  ): Promise<Outcome<CatalogRecord>> {
    const actor = typeof actorOrId === 'string' ? undefined : actorOrId;
    const id = typeof actorOrId === 'string' ? actorOrId : requestedId;
    if (!id) return failure('validation', 'Missing catalog entry ID');
    const importedId = importedCatalogId(id);
    if (importedId !== undefined) {
      if (!this.dependencies.imports) {
        return failure('not_found', 'Catalog entry not found');
      }
      try {
        const document = await this.dependencies.imports.reader.getCatalog(
          importedId,
        );
        if (!document) return failure('not_found', 'Catalog entry not found');
        const profile = this.dependencies.imports.codec.decode(
          document.id,
          document.data,
        );
        const linked = profile.linkedLocalCatalogId
          ? await this.getLocal(actor, profile.linkedLocalCatalogId)
          : undefined;
        return success(importedCatalogRecord(profile, linked));
      } catch {
        return failure('dependency_failure', 'Could not load the catalog entry');
      }
    }
    try {
      const document = await this.dependencies.documents.get(COLLECTIONS.catalog, id);
      if (!document) return failure('not_found', 'Catalog entry not found');
      const decoded = this.dependencies.codecs.catalog.decode(
        document.id,
        document.data,
      );
      const canViewContributors = await this.dependencies.contributors.canView(actor);
      const contributor = await this.dependencies.contributors.visibleForContent(
        actor,
        'catalog',
        id,
      );
      return success(
        localCatalogRecord(
          withCatalogContributor(
            decoded,
            contributor ?? (canViewContributors ? decoded.createdBy : undefined),
          ),
        ),
      );
    } catch {
      return failure('dependency_failure', 'Could not load the catalog entry');
    }
  }

  async media(id: string): Promise<Outcome<readonly DisplayMediaAsset[]>> {
    const importedId = importedCatalogId(id);
    if (importedId !== undefined) {
      if (!this.dependencies.imports) return success([]);
      try {
        const document = await this.dependencies.imports.reader.getCatalog(
          importedId,
        );
        if (!document) return failure('not_found', 'Catalog entry not found');
        const profile = this.dependencies.imports.codec.decode(
          document.id,
          document.data,
        );
        if (profile.linkedLocalCatalogId) {
          const localMedia = await this.dependencies.media.list(
            `${COLLECTIONS.catalog}/${profile.linkedLocalCatalogId}`,
          );
          if (localMedia.length > 0) return success(localMedia);
        }
        return success(importedCatalogMedia(profile));
      } catch {
        return failure('dependency_failure', 'Could not load catalog media');
      }
    }
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
        this.dependencies.documents.commit([
          {
            operation: 'put',
            collection: COLLECTIONS.catalog,
            id,
            data: this.dependencies.codecs.catalog.encode(entry),
          },
          this.dependencies.contributors.write('catalog', id, actor!),
          ...catalogTagAssignmentWrite(
            id,
            draft.tagIds,
            this.dependencies.codecs.catalogTagAssignment,
          ),
        ]),
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
    if (importedCatalogId(id) !== undefined) {
      return failure(
        'forbidden',
        'Use local overrides to edit an iNaturalist catalog profile',
      );
    }
    const existing = await this.get(actor, id);
    if (!existing.ok) return existing;
    if (existing.value.source !== 'campus-cats') {
      return failure(
        'forbidden',
        'Use local overrides to edit an iNaturalist catalog profile',
      );
    }
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
        this.dependencies.documents.commit([
          {
            operation: 'put',
            collection: COLLECTIONS.catalog,
            id,
            data: this.dependencies.codecs.catalog.encode(entry),
          },
          this.dependencies.contributors.write('catalog', id, actor!),
          ...catalogTagAssignmentWrite(
            id,
            update.tagIds,
            this.dependencies.codecs.catalogTagAssignment,
          ),
        ]),
    });
    return mediaResult.ok ? success(entry, mediaResult.warnings) : mediaResult;
  }

  async remove(actor: User | undefined, id: string): Promise<Outcome<void>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    if (importedCatalogId(id) !== undefined) {
      return failure(
        'forbidden',
        'iNaturalist catalog profiles can be hidden but not deleted',
      );
    }
    const existing = await this.get(actor, id);
    if (!existing.ok) return existing;
    if (existing.value.source !== 'campus-cats') {
      return failure(
        'forbidden',
        'iNaturalist catalog profiles can be hidden but not deleted',
      );
    }

    try {
      await this.dependencies.documents.commit([
        { operation: 'remove', collection: COLLECTIONS.catalog, id },
        this.dependencies.contributors.remove('catalog', id),
        {
          operation: 'remove',
          collection: COLLECTIONS.catalogTagAssignments,
          id,
        },
      ]);
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

  private async getLocal(actor: User | undefined, id: string): Promise<CatalogEntry | undefined> {
    const document = await this.dependencies.documents.get(
      COLLECTIONS.catalog,
      id,
    );
    if (!document) return undefined;
    const decoded = this.dependencies.codecs.catalog.decode(document.id, document.data);
    const canViewContributors = await this.dependencies.contributors.canView(actor);
    const contributor = await this.dependencies.contributors.visibleForContent(actor, 'catalog', id);
    return withCatalogContributor(
      decoded,
      contributor ?? (canViewContributors ? decoded.createdBy : undefined),
    );
  }
}

function catalogTagAssignmentWrite(
  catalogId: string,
  tagIds: readonly string[] | undefined,
  codec: PersistenceCodec<CatalogTagAssignment>,
) {
  if (tagIds === undefined) return [];
  const assignment = parseCatalogTagAssignment({ catalogId, tagIds });
  return [{
    operation: 'put' as const,
    collection: COLLECTIONS.catalogTagAssignments,
    id: catalogId,
    data: codec.encode(assignment),
  }];
}

function withCatalogContributor(
  entry: CatalogEntry,
  createdBy: User | undefined,
): CatalogEntry {
  const { createdBy: _legacyContributor, ...value } = entry;
  return parseCatalogEntry({ ...value, createdBy });
}

function importedCatalogId(id: string): number | undefined {
  const match = /^inat-guide-(\d+)$/.exec(id);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function importedCatalogRecord(
  profile: ImportedCatalogProfile,
  linkedLocal?: CatalogEntry,
): CatalogRecord {
  const sourceCat = {
    name: profile.displayName,
    descShort: profile.shortDescription,
    yearsRecorded: profile.metadata.yearsRecorded.join(', ') || undefined,
    AoR: profile.metadata.areasOfResidence.join(', ') || undefined,
    currentStatus: profile.metadata.currentStatus,
    furLength: profile.metadata.furLength,
    furPattern: profile.metadata.furPatterns.join(', ') || undefined,
    colorPattern: profile.metadata.furPatterns.join(', ') || undefined,
    tnr: profile.metadata.tnr,
    sex: profile.metadata.sex,
  };
  const cat = linkedLocal
    ? linkedLocal.cat
    : { ...sourceCat, ...profile.overrides };
  return Object.freeze({
    source: 'inaturalist' as const,
    id: `inat-guide-${profile.id}`,
    sourceId: profile.id,
    cat: Object.freeze(cat),
    credits: linkedLocal
      ? `${linkedLocal.credits}${linkedLocal.credits ? '\n' : ''}iNaturalist source: ${profile.sourceUrl}`
      : `iNaturalist Georgia Tech Cats guide: ${profile.sourceUrl}`,
    sourceUrl: profile.sourceUrl,
    sourceUpdatedAt: profile.sourceUpdatedAt,
    linkedLocalCatalogId: profile.linkedLocalCatalogId,
    matchStatus: profile.matchStatus,
    sourceActive: profile.sourceActive,
    visible: profile.visible,
    moderation: profile.moderation,
    localContribution: linkedLocal
        ? {
          createdAt: linkedLocal.createdAt,
          createdBy: linkedLocal.createdBy,
          credits: linkedLocal.credits,
        }
      : undefined,
  });
}

function mutationDenied(actor: User | undefined): Outcome<never> | undefined {
  if (!actor) return failure('unauthenticated', 'Sign in to manage the catalog');
  if (!canManageFeature(actor.role)) {
    return failure('forbidden', 'Only officers may manage the catalog');
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
