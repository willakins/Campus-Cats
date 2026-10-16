import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { requestPushNotificationToken } from './pushNotifications';

jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

describe('Push notification registration', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExponentPushToken[test-device]',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates an Android channel before requesting notification permission', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    let channelCreated = false;
    (Notifications.setNotificationChannelAsync as jest.Mock).mockImplementation(
      async () => {
        channelCreated = true;
      },
    );
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockImplementation(
      async () => {
        if (!channelCreated) {
          throw new Error(
            'Android requires a channel before requesting permission',
          );
        }
        return { status: 'granted' };
      },
    );

    await expect(requestPushNotificationToken()).resolves.toBe(
      'ExponentPushToken[test-device]',
    );
  });

  it('registers iOS without calling the Android channel API', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    await expect(requestPushNotificationToken()).resolves.toBe(
      'ExponentPushToken[test-device]',
    );
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
