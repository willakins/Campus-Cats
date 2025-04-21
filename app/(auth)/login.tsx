import { Image, SafeAreaView, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LoginForm } from '@/forms';
import { useAuth } from '@/providers';
import { containerStyles, globalStyles } from '@/styles';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';

const registerForPushNotificationsAsync = async () => {
  if (!Device.isDevice) {
    alert('Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
};

const savePushTokenToFirestore = async (uid: string, token: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { expoPushToken: token }, { merge: true });
    console.log('Push token saved to Firestore');
  } catch (error) {
    console.error('Error saving push token to Firestore:', error);
  }
};

const LoginScreen = () => {
  const { login } = useAuth();
  const router = useRouter();

  const loginUser = async (username: string, password: string) => {
    await login(username, password);

    // Get the logged-in user
    const currentUser = auth.currentUser;

    if (currentUser) {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await savePushTokenToFirestore(currentUser.uid, token);
      }
    }

    router.replace('/(app)/(tabs)');
  };

  return (
    <SafeAreaView style={globalStyles.screen}>
      <ScrollView contentContainerStyle={containerStyles.scrollViewCenter} keyboardShouldPersistTaps="handled">
        <Image source={require('@/assets/images/campus_cats_logo.png')} style={containerStyles.imageLarge} />
        <LoginForm
          onSubmit={loginUser}
          type="login"
          onSwitchType={() => router.push('/whitelist')}
          forgotPassword
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;
