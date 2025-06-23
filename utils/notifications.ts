import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, setDoc } from 'firebase/firestore';

import { db } from '@/config/firebase';

export const registerForPushNotificationsAsync = async (): Promise<
  string | null
> => {
  if (!Device.isDevice) {
    //Might break stuff oopsy but just to make sure
    alert('Must use a physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    // Requesting permission
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    // Alert if that doesn't happen
    alert('Failed to get push token for push notification!');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  console.log('Expo Push Token:', tokenData.data);
  return tokenData.data;
};

export const savePushTokenToFirestore = async (uid: string, token: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { expoPushToken: token }, { merge: true }); //Yippee!!
    console.log('Push token saved to Firestore');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
};
