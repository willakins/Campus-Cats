import * as ImagePicker from 'expo-image-picker';

import { ExpoImageSelection } from './ExpoImageSelection';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

describe('ExpoImageSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({
      status: 'granted',
    } as ImagePicker.MediaLibraryPermissionResponse);
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://avatar.jpg' }],
    } as ImagePicker.ImagePickerSuccessResult);
  });

  it('returns the selected image for the in-app circular editor', async () => {
    const selection = new ExpoImageSelection();

    await expect(
      selection.pickFromLibrary(),
    ).resolves.toEqual({ localUri: 'file://avatar.jpg' });
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
      quality: 1,
    });
  });
});
