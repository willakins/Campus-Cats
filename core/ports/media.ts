export type MediaRole = 'profile' | 'gallery';
export type MediaAssetId = string & { readonly __brand: 'MediaAssetId' };

export interface StoredMediaAsset {
  readonly id: MediaAssetId;
  readonly url: string;
  readonly role: MediaRole;
}

export interface ExternalMediaAsset {
  readonly kind: 'external';
  readonly id: MediaAssetId;
  readonly url: string;
  readonly thumbnailUrl: string;
  readonly role: MediaRole;
  readonly sourceUrl: string;
  readonly attribution: string;
  readonly licenseCode: string;
  readonly licenseUrl: string;
}

export type DisplayMediaAsset = StoredMediaAsset | ExternalMediaAsset;

export const isExternalMediaAsset = (
  asset: DisplayMediaAsset,
): asset is ExternalMediaAsset => 'kind' in asset && asset.kind === 'external';

export interface MediaUpload {
  readonly id: MediaAssetId;
  readonly localUri: string;
  readonly role: MediaRole;
  readonly ownerId?: string;
}

export interface MediaStore {
  list(folder: string): Promise<readonly StoredMediaAsset[]>;
  upload(upload: MediaUpload): Promise<StoredMediaAsset>;
  remove(id: MediaAssetId): Promise<void>;
}

export const mediaAssetId = (value: string): MediaAssetId => {
  if (!value.trim()) {
    throw new Error('Media identity must not be empty');
  }
  return value as MediaAssetId;
};
