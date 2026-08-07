import AsyncStorage from '@react-native-async-storage/async-storage';

import { AsyncStorageUniversitySelection } from './AsyncStorageUniversitySelection';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('AsyncStorageUniversitySelection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('round-trips a validated university selection', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(
      JSON.stringify({
        universityId: '139755',
        universityName: 'Georgia Tech',
        clubId: 'campus-cats',
      }),
    );
    const store = new AsyncStorageUniversitySelection();

    await expect(store.load()).resolves.toMatchObject({ clubId: 'campus-cats' });
    await store.save({
      universityId: '139755',
      universityName: 'Georgia Tech',
      clubId: 'campus-cats',
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'campus-cats:university-selection',
      expect.stringContaining('139755'),
    );
  });

  it('removes corrupt selections instead of restoring them', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue('{"universityId":7}');
    const store = new AsyncStorageUniversitySelection();

    await expect(store.load()).resolves.toBeUndefined();
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });
});
