import { DocumentStore } from '../../core/ports';

export function documentStoreContract(
  adapterName: string,
  createStore: () => Promise<DocumentStore> | DocumentStore,
): void {
  describe(`${adapterName} document store contract`, () => {
    it('supports missing reads and a complete document lifecycle', async () => {
      const store = await createStore();
      const collection = 'contact-info';
      const id = 'contract-contact-1';

      await store.remove(collection, id);
      await expect(store.get(collection, id)).resolves.toBeUndefined();

      await store.put(collection, id, {
        name: 'Campus Cats',
        email: 'cats@gatech.edu',
      });
      await expect(store.get(collection, id)).resolves.toEqual({
        id,
        data: { name: 'Campus Cats', email: 'cats@gatech.edu' },
      });

      await store.put(collection, id, {
        name: 'Campus Cats Officers',
        email: 'cats@gatech.edu',
      });
      await expect(store.list(collection)).resolves.toContainEqual({
        id,
        data: {
          name: 'Campus Cats Officers',
          email: 'cats@gatech.edu',
        },
      });

      await store.remove(collection, id);
      await expect(store.get(collection, id)).resolves.toBeUndefined();
    });
  });
}
