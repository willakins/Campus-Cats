import {
  FirebaseStorage,
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
} from 'firebase/storage';

import {
  MediaStore,
  MediaUpload,
  StoredMediaAsset,
  mediaAssetId,
} from '../../core/ports';

export class FirebaseMediaStore implements MediaStore {
  constructor(
    private readonly storage: FirebaseStorage,
    private readonly loadBlob: (localUri: string) => Promise<Blob> = async (
      localUri,
    ) => (await fetch(localUri)).blob(),
  ) {}

  async list(folder: string): Promise<readonly StoredMediaAsset[]> {
    const result = await listAll(ref(this.storage, folder));
    return Promise.all(
      result.items.map(async (item) => ({
        id: mediaAssetId(item.fullPath),
        url: await getDownloadURL(item),
        role: item.name.toLowerCase().startsWith('profile')
          ? ('profile' as const)
          : ('gallery' as const),
      })),
    );
  }

  async upload(upload: MediaUpload): Promise<StoredMediaAsset> {
    const object = ref(this.storage, upload.id);
    const blob = await this.loadBlob(upload.localUri);
    await uploadBytes(
      object,
      blob,
      {
        contentType: blob.type || 'image/jpeg',
        ...(upload.ownerId
          ? { customMetadata: { ownerId: upload.ownerId } }
          : {}),
      },
    );
    return {
      id: mediaAssetId(object.fullPath),
      url: await getDownloadURL(object),
      role: upload.role,
    };
  }

  async remove(id: string): Promise<void> {
    await deleteObject(ref(this.storage, id));
  }
}
