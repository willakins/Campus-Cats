import { IdGenerator, Outcome, failure, success } from '../domain';
import {
  MediaAssetId,
  MediaStore,
  StoredMediaAsset,
  mediaAssetId,
} from '../ports';

export type MediaSelection =
  | { readonly kind: 'stored'; readonly id: MediaAssetId }
  | { readonly kind: 'local'; readonly localUri: string };

export interface ReconciledMedia {
  readonly profile: StoredMediaAsset;
  readonly gallery: readonly StoredMediaAsset[];
}

export interface ReconcileMediaRequest {
  readonly folder: string;
  readonly profile: MediaSelection;
  readonly gallery: readonly MediaSelection[];
  readonly persist: (media: ReconciledMedia) => Promise<void>;
}

export interface ReconcileGalleryRequest {
  readonly folder: string;
  readonly gallery: readonly MediaSelection[];
  readonly persist: (gallery: readonly StoredMediaAsset[]) => Promise<void>;
}

export const storedMedia = (id: string): MediaSelection => ({
  kind: 'stored',
  id: mediaAssetId(id),
});

export const localMedia = (localUri: string): MediaSelection => ({
  kind: 'local',
  localUri,
});

export class MediaCoordinator {
  constructor(
    private readonly media: MediaStore,
    private readonly ids: IdGenerator,
  ) {}

  async reconcile(
    request: ReconcileMediaRequest,
  ): Promise<Outcome<ReconciledMedia>> {
    let current: readonly StoredMediaAsset[];
    try {
      current = await this.media.list(request.folder);
    } catch {
      return failure('dependency_failure', 'Could not load existing media');
    }
    const currentById = new Map(current.map((asset) => [asset.id, asset]));
    const uploaded: StoredMediaAsset[] = [];

    const resolveSelection = async (
      selection: MediaSelection,
      role: 'profile' | 'gallery',
    ): Promise<StoredMediaAsset> => {
      if (selection.kind === 'stored') {
        const existing = currentById.get(selection.id);
        if (!existing) {
          throw new Error('Selected stored media does not exist');
        }
        return { ...existing, role };
      }

      const uniqueId = this.ids.next();
      const filename = role === 'profile' ? `profile-${uniqueId}.jpg` : `${uniqueId}.jpg`;
      const asset = await this.media.upload({
        id: mediaAssetId(`${request.folder}/${filename}`),
        localUri: selection.localUri,
        role,
      });
      uploaded.push(asset);
      return asset;
    };

    let next: ReconciledMedia;
    try {
      next = {
        profile: await resolveSelection(request.profile, 'profile'),
        gallery: await Promise.all(
          request.gallery.map((selection) =>
            resolveSelection(selection, 'gallery'),
          ),
        ),
      };
    } catch {
      await this.compensate(uploaded);
      return failure('dependency_failure', 'Could not upload selected media');
    }

    try {
      await request.persist(next);
    } catch {
      const compensated = await this.compensate(uploaded);
      return compensated
        ? failure('dependency_failure', 'Could not persist media changes')
        : failure(
            'partial_failure',
            'Could not persist media changes or remove temporary uploads',
          );
    }

    const retainedIds = new Set([
      next.profile.id,
      ...next.gallery.map(({ id }) => id),
    ]);
    const obsolete = current.filter(({ id }) => !retainedIds.has(id));
    const cleanupResults = await Promise.allSettled(
      obsolete.map(({ id }) => this.media.remove(id)),
    );
    const cleanupFailed = cleanupResults.some(
      ({ status }) => status === 'rejected',
    );

    return success(
      next,
      cleanupFailed
        ? [
            {
              code: 'cleanup_failed',
              message:
                'Saved changes, but some obsolete media could not be removed',
            },
          ]
        : [],
    );
  }

  async reconcileGallery(
    request: ReconcileGalleryRequest,
  ): Promise<Outcome<readonly StoredMediaAsset[]>> {
    let current: readonly StoredMediaAsset[];
    try {
      current = await this.media.list(request.folder);
    } catch {
      return failure('dependency_failure', 'Could not load existing media');
    }
    const currentById = new Map(current.map((asset) => [asset.id, asset]));
    const uploaded: StoredMediaAsset[] = [];

    let gallery: readonly StoredMediaAsset[];
    try {
      gallery = await Promise.all(
        request.gallery.map(async (selection) => {
          if (selection.kind === 'stored') {
            const existing = currentById.get(selection.id);
            if (!existing) throw new Error('Selected stored media does not exist');
            return { ...existing, role: 'gallery' as const };
          }
          const filename = `${this.ids.next()}.jpg`;
          const asset = await this.media.upload({
            id: mediaAssetId(`${request.folder}/${filename}`),
            localUri: selection.localUri,
            role: 'gallery',
          });
          uploaded.push(asset);
          return asset;
        }),
      );
    } catch {
      await this.compensate(uploaded);
      return failure('dependency_failure', 'Could not upload selected media');
    }

    try {
      await request.persist(gallery);
    } catch {
      const compensated = await this.compensate(uploaded);
      return compensated
        ? failure('dependency_failure', 'Could not persist media changes')
        : failure(
            'partial_failure',
            'Could not persist media changes or remove temporary uploads',
          );
    }

    const retainedIds = new Set(gallery.map(({ id }) => id));
    const cleanup = await Promise.allSettled(
      current
        .filter(({ id }) => !retainedIds.has(id))
        .map(({ id }) => this.media.remove(id)),
    );
    return success(
      gallery,
      cleanup.some(({ status }) => status === 'rejected')
        ? [
            {
              code: 'cleanup_failed',
              message:
                'Saved changes, but some obsolete media could not be removed',
            },
          ]
        : [],
    );
  }

  private async compensate(assets: readonly StoredMediaAsset[]): Promise<boolean> {
    const results = await Promise.allSettled(
      assets.map(({ id }) => this.media.remove(id)),
    );
    return results.every(({ status }) => status === 'fulfilled');
  }
}
