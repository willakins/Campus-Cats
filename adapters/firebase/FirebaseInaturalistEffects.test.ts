import { Functions } from 'firebase/functions';

import { FirebaseInaturalistEffects } from './FirebaseInaturalistEffects';

const mockCallable = jest.fn();

jest.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => (data: unknown) =>
    mockCallable(name, data),
}));

describe('FirebaseInaturalistEffects', () => {
  beforeEach(() => {
    mockCallable.mockReset();
    mockCallable.mockResolvedValue({ data: { status: 'success', runId: 'run-1' } });
  });

  it('uses only role-checked callable workflows and removes undefined overrides', async () => {
    const effects = new FirebaseInaturalistEffects({} as Functions);

    await expect(effects.runSync()).resolves.toEqual({
      status: 'success',
      runId: 'run-1',
    });
    await effects.moderate(
      'observation',
      321,
      true,
      'Sensitive location',
    );
    await effects.updateCatalogOverrides(2113386, {
      behavior: 'Cautious',
      descLong: undefined,
    });
    await effects.linkCatalog(2113386, 'local-mimi');
    await effects.linkCatalog(2113386);

    expect(mockCallable.mock.calls).toEqual([
      ['runInaturalistSync', {}],
      [
        'moderateInaturalistRecord',
        {
          kind: 'observation',
          id: 321,
          hidden: true,
          reason: 'Sensitive location',
        },
      ],
      [
        'updateInaturalistCatalog',
        { id: 2113386, overrides: { behavior: 'Cautious' } },
      ],
      [
        'linkInaturalistCatalog',
        { id: 2113386, localCatalogId: 'local-mimi' },
      ],
      ['linkInaturalistCatalog', { id: 2113386, localCatalogId: null }],
    ]);
  });

  it('rejects malformed manual synchronization responses', async () => {
    mockCallable.mockResolvedValueOnce({ data: { status: 'complete' } });

    const effects = new FirebaseInaturalistEffects({} as Functions);

    await expect(effects.runSync()).rejects.toThrow(
      'Invalid iNaturalist synchronization response',
    );
  });
});
