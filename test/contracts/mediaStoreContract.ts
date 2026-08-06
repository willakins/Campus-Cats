import { MediaStore, mediaAssetId } from '../../core/ports';

export function mediaStoreContract(
  adapterName: string,
  createStore: () => Promise<MediaStore> | MediaStore,
): void {
  describe(`${adapterName} media store contract`, () => {
    it('uploads, lists, and removes opaque media identities', async () => {
      const store = await createStore();
      const id = mediaAssetId('catalog/contract-cat-1/profile-contract.jpg');

      await store.remove(id).catch(() => undefined);
      await expect(
        store.upload({
          id,
          localUri: 'contract://profile',
          role: 'profile',
        }),
      ).resolves.toMatchObject({ id, role: 'profile' });
      await expect(store.list('catalog/contract-cat-1')).resolves.toContainEqual(
        expect.objectContaining({ id, role: 'profile' }),
      );

      await store.remove(id);
      await expect(store.list('catalog/contract-cat-1')).resolves.toEqual([]);
    });
  });
}
