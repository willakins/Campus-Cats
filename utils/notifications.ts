import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  if (!Device.isDevice) { //Might break stuff oopsy but just to make sure
    alert('Must use a physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') { // Requesting permission
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') { // Alert if that doesn't happen
    alert('Failed to get push token for push notification!');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
};
