import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';
import { FirebaseCatalogFavorites } from './FirebaseCatalogFavorites';
jest.mock('uuid', () => ({ v4: () => 'default-operation-id' }));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
const invoke = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(httpsCallable)
    .mockReturnValue(Object.assign(invoke, { stream: jest.fn() }));
});
it('retries uncertain commits with the identical operation ID', async () => {
  invoke
    .mockRejectedValueOnce({ code: 'functions/unavailable' })
    .mockResolvedValueOnce({
      data: {
        user_id: 'real-user',
        catalog_id: 'cat',
        created_at: '2026-10-05T12:00:00Z',
      },
    });
  const newId = jest.fn(() => 'operation-id');
  const result = await new FirebaseCatalogFavorites(
    {} as Functions,
    newId,
  ).setFavorite('cat');
  expect(result).toMatchObject({ userId: 'real-user', catalogId: 'cat' });
  expect(newId).toHaveBeenCalledTimes(1);
  expect(invoke.mock.calls[0]).toEqual(invoke.mock.calls[1]);
  expect(invoke).toHaveBeenCalledWith({
    operation: 'setCatalogFavorite',
    operationId: 'operation-id',
    catalogId: 'cat',
  });
});
it('does not retry permission failures and supports clearing a favorite', async () => {
  invoke.mockRejectedValueOnce({ code: 'functions/permission-denied' });
  const adapter = new FirebaseCatalogFavorites({} as Functions, () => 'id');
  await expect(adapter.setFavorite('cat')).rejects.toMatchObject({
    code: 'functions/permission-denied',
  });
  expect(invoke).toHaveBeenCalledTimes(1);
  invoke.mockResolvedValue({ data: null });
  await expect(adapter.setFavorite(undefined)).resolves.toBeUndefined();
});
