import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { getAuth, SAMLAuthProvider, signInWithCredential } from 'firebase/auth';
import { useRouter } from 'expo-router';

import { firebaseConfig } from '@/config/firebase';
import { fetchUser, mutateUser } from '@/models';
import { containerStyles } from '@/styles';

const SAMLRedirect = () => {
  const router = useRouter();
  const auth = getAuth();
  const redirectUrl = Linking.createURL('/saml-sign-in');
  const backendUrl = 'https://campuscats-d7a5e.firebaseapp.com/firebase-wrapper-app.html';
  const [redirectData, setRedirectData] = useState<Linking.ParsedURL | null>(null);

  const [visible, setVisible] = useState<boolean>(false);

  const handleSSOSignIn = async () => {
    if (redirectData?.queryParams?.credential) {
      try {
        setVisible(true);
        const authCredential = SAMLAuthProvider.credentialFromJSON(
          JSON.parse(redirectData.queryParams.credential as string)
        );
        const userCred = await signInWithCredential(auth, authCredential);
        
        // Fetch user data and set (necessary for tracking user.role)
        const userData = await fetchUser(userCred.user.uid); 
        mutateUser(userData);

        router.replace('/(app)/(tabs)');
      } catch (error) {
        Alert.alert('SSO sign-in failed.');
        console.error('SSO error:', error);
      } finally {
        setVisible(false);
      }
    }
  };

  useEffect(() => {
    _openAuthSessionAsync()
  }, []);

  const _openAuthSessionAsync = async () => {
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        `${backendUrl}?linkingUri=${redirectUrl}&apiKey=${firebaseConfig.apiKey}&authDomain=${firebaseConfig.authDomain}`,
        redirectUrl,
        {
          dismissButtonStyle: 'cancel',
          enableDefaultShareMenuItem: false,
        }
      ) as WebBrowser.WebBrowserRedirectResult;

      if (result?.url) {
        setRedirectData(Linking.parse(result.url));
      } else {
        console.warn('SSO session dismissed or failed with type:', result?.type);
      }
      handleSSOSignIn();
    } catch (error) {
      Alert.alert('SSO session error.');
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <ScrollView
        contentContainerStyle={containerStyles.scrollViewCenterPadded}
        keyboardShouldPersistTaps="handled"
      >
      </ScrollView>
    </SafeAreaView>
  );
};

export default SAMLRedirect;
