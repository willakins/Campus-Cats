import { documentStoreContract } from '../../test/contracts/documentStoreContract';
import { InMemoryDocumentStore } from './InMemoryDocumentStore';

documentStoreContract('in-memory', () => new InMemoryDocumentStore());

describe('InMemoryDocumentStore failure injection', () => {
  it('fails one requested operation and then recovers', async () => {
    const store = new InMemoryDocumentStore();
    store.failNext('put', new Error('planned dependency failure'));

    await expect(store.put('catalog', 'cat-1', { name: 'Goldie' })).rejects.toThrow(
      'planned dependency failure',
    );
    await expect(
      store.put('catalog', 'cat-1', { name: 'Goldie' }),
    ).resolves.toBeUndefined();
  });
});
