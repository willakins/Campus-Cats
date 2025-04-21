import React, { useState } from 'react';
import { Text, Image, View, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';

import { firebaseConfig } from '@/config/firebase';
import { Button, SnackbarMessage } from '@/components';
import { buttonStyles, containerStyles, globalStyles, textStyles } from '@/styles';
import { useAuth } from '@/providers';

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
  const router = useRouter();
  const { login } = useAuth();
  const [visible, setVisible] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const [formData, setFormData] = useState<{email: string; password: string;}>({email:"", password:""});
  const handleChange = (field: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: val }));
  };

  const loginWhitelistUser = async () => {
    try {
      setVisible(true);
      await login(formData.email, formData.password);
      router.replace('/(app)/(tabs)');
    } catch {
      alert('Failed login. Consider using SSO.')
    } finally {
      setVisible(false);
    }
  };
  
  return (
    <SafeAreaView style={containerStyles.wrapper}>
       <SnackbarMessage text="Logging in..." visible={visible} setVisible={setVisible} />
      <ScrollView
        contentContainerStyle={containerStyles.scrollViewCenterPadded}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('@/assets/images/campus_cats_logo.png')}
          style={containerStyles.imageLarge}
          onLoad={() =>setImageLoaded(true)}
        /> 
        {!imageLoaded ? <View style={containerStyles.imageLarge}><Text style={textStyles.listTitle}>Loading...</Text></View>: null}
        <View style={containerStyles.shadedCard}>
          <Text style={textStyles.label}>Email</Text>
          <View style={containerStyles.smallInputContainer}>
            <TextInput 
              value={formData.email || ''}
              placeholder="email"
              placeholderTextColor="#888"
              onChangeText={(text) => handleChange('email', text)} 
              style={textStyles.input}
              multiline={false} />
          </View>
          <Text style={textStyles.label}>Password</Text>
          <View style={containerStyles.smallInputContainer}>
            <TextInput 
              value={formData.password || ''}
              placeholder="password"
              placeholderTextColor="#888"
              onChangeText={(text) => handleChange('password', text)} 
              style={textStyles.input}
              secureTextEntry={true}
              multiline={false} />
          </View>
          <Button style={buttonStyles.mediumButton}onPress={loginWhitelistUser}>
            <Text style={textStyles.bigButtonText}>Sign in using Email</Text>
          </Button>
          <Button style={buttonStyles.mediumButton} onPress={() => router.navigate('/saml-sign-in')}>
            <Text style={textStyles.bigButtonText}>Sign in using SSO</Text>
          </Button>
          <Button
            style={buttonStyles.mediumButton}
            onPress={() => router.navigate('/whitelist')}
          >
            <Text style={textStyles.bigButtonText}>Apply For Whitelist</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;
