import React, { useEffect, useState } from 'react';
import { Text, Image, View, SafeAreaView, ScrollView, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { getAuth, SAMLAuthProvider, signInWithCredential } from 'firebase/auth';
import { useRouter } from 'expo-router';

import { firebaseConfig } from '@/config/firebase';
import { Button } from '@/components';
import { buttonStyles, containerStyles, globalStyles, textStyles } from '@/styles';
import { useAuth } from '@/providers';
import { fetchUser, mutateUser } from '@/models';

const LoginScreen = () => {
  const router = useRouter();
  const auth = getAuth();
  const redirectUrl = Linking.createURL('/saml-sign-in');
  const backendUrl = 'https://campuscats-d7a5e.firebaseapp.com/firebase-wrapper-app.html';

  const { loading, currentUser } = useAuth();
  const [redirectData, setRedirectData] = useState<Linking.ParsedURL | null>(null);

  useEffect(() => {
    const handleSSOSignIn = async () => {
      if (redirectData?.queryParams?.credential) {
        try {
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
        }
      }
    };

    handleSSOSignIn();
  }, [redirectData]);

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
    } catch (error) {
      Alert.alert('SSO session error.');
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <ScrollView
        contentContainerStyle={containerStyles.scrollViewCenter}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('@/assets/images/campus_cats_logo.png')}
          style={containerStyles.imageLarge}
        />
        <View style={containerStyles.shadedCard}>
          <Button style={buttonStyles.mediumButton} onPress={_openAuthSessionAsync}>
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
