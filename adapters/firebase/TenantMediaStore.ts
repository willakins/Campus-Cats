import {
  MediaStore,
  MediaUpload,
  StoredMediaAsset,
  mediaAssetId,
} from '../../core/ports';
import { FirebaseTenantScope } from './FirebaseTenantScope';

export class TenantMediaStore implements MediaStore {
  constructor(
    private readonly media: MediaStore,
    private readonly scope: FirebaseTenantScope,
  ) {}

  async list(folder: string): Promise<readonly StoredMediaAsset[]> {
    const assets = await this.media.list(this.scope.media(folder));
    return assets.map((asset) => this.unscoped(asset));
  }

  async upload(upload: MediaUpload): Promise<StoredMediaAsset> {
    const asset = await this.media.upload({
      ...upload,
      id: mediaAssetId(this.scope.media(upload.id)),
    });
    return this.unscoped(asset);
  }

  remove(id: string): Promise<void> {
    return this.media.remove(mediaAssetId(this.scope.media(id)));
  }

  private unscoped(asset: StoredMediaAsset): StoredMediaAsset {
    const prefix = `clubs/${this.scope.clubId}/`;
    return asset.id.startsWith(prefix)
      ? { ...asset, id: mediaAssetId(asset.id.slice(prefix.length)) }
      : asset;
  }
}
