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

  list(folder: string): Promise<readonly StoredMediaAsset[]> {
    return this.media.list(this.scope.media(folder));
  }

  upload(upload: MediaUpload): Promise<StoredMediaAsset> {
    return this.media.upload({
      ...upload,
      id: mediaAssetId(this.scope.media(upload.id)),
    });
  }

  remove(id: string): Promise<void> {
    return this.media.remove(mediaAssetId(this.scope.media(id)));
  }
}
