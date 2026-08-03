import {
  MediaAssetId,
  MediaStore,
  MediaUpload,
  StoredMediaAsset,
  mediaAssetId,
} from '../../core/ports';

type Operation = 'list' | 'upload' | 'remove';

interface MediaSeed {
  readonly id: string;
  readonly url: string;
  readonly role: 'profile' | 'gallery';
}

export class InMemoryMediaStore implements MediaStore {
  readonly #assets = new Map<MediaAssetId, StoredMediaAsset>();
  readonly #failures = new Map<Operation, Error>();

  constructor(seed: readonly MediaSeed[] = []) {
    for (const asset of seed) {
      const id = mediaAssetId(asset.id);
      this.#assets.set(id, { ...asset, id });
    }
  }

  failNext(operation: Operation, error: Error): void {
    this.#failures.set(operation, error);
  }

  async list(folder: string): Promise<readonly StoredMediaAsset[]> {
    this.maybeFail('list');
    return [...this.#assets.values()].filter(({ id }) =>
      id.startsWith(`${folder}/`),
    );
  }

  async upload(upload: MediaUpload): Promise<StoredMediaAsset> {
    this.maybeFail('upload');
    const asset = {
      id: upload.id,
      url: `memory://${upload.id}`,
      role: upload.role,
    } as const;
    this.#assets.set(asset.id, asset);
    return asset;
  }

  async remove(id: MediaAssetId): Promise<void> {
    this.maybeFail('remove');
    this.#assets.delete(id);
  }

  ids(): string[] {
    return [...this.#assets.keys()].sort();
  }

  private maybeFail(operation: Operation): void {
    const failure = this.#failures.get(operation);
    if (failure) {
      this.#failures.delete(operation);
      throw failure;
    }
  }
}
