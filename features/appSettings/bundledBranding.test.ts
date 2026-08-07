import { Asset } from 'expo-asset';

import { loadBundledClubLogoUri } from './bundledBranding';

const mockDownloadAsync = jest.fn();

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({ downloadAsync: mockDownloadAsync })),
  },
}));

describe('bundled club logo migration asset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads the bundled artwork and returns its local file', async () => {
    mockDownloadAsync.mockResolvedValue({
      localUri: 'file://current-club-logo.png',
      uri: 'https://bundle.example.com/current-club-logo.png',
    });

    await expect(loadBundledClubLogoUri()).resolves.toBe(
      'file://current-club-logo.png',
    );
    expect(Asset.fromModule).toHaveBeenCalledTimes(1);
  });

  it('uses the bundle URI when a local file is not required', async () => {
    mockDownloadAsync.mockResolvedValue({
      localUri: null,
      uri: 'https://bundle.example.com/current-club-logo.png',
    });

    await expect(loadBundledClubLogoUri()).resolves.toBe(
      'https://bundle.example.com/current-club-logo.png',
    );
  });

  it('rejects an asset without a usable URI', async () => {
    mockDownloadAsync.mockResolvedValue({ localUri: null, uri: '' });

    await expect(loadBundledClubLogoUri()).rejects.toThrow(
      'The bundled club logo could not be loaded',
    );
  });
});
