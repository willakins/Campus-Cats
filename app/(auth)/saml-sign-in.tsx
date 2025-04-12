import React, { useEffect, useState } from 'react';
import { Text, SafeAreaView, ScrollView, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { getAuth, SAMLAuthProvider, signInWithCredential } from 'firebase/auth';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage } from '@/components';
import { firebaseConfig } from '@/config/firebase';
import { fetchUser, mutateUser } from '@/models';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';

const SAMLRedirect = () => {
  const router = useRouter();
  const auth = getAuth();
  const redirectUrl = Linking.createURL('/saml-sign-in');
  const backendUrl = 'https://campuscats-d7a5e.firebaseapp.com/firebase-wrapper-app.html';
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    _openAuthSessionAsync()
  }, []);

  const _openAuthSessionAsync = async () => {
    try {
      let redirectData: Linking.ParsedURL | null = null;
      const result = await WebBrowser.openAuthSessionAsync(
        `${backendUrl}?linkingUri=${redirectUrl}&apiKey=${firebaseConfig.apiKey}&authDomain=${firebaseConfig.authDomain}`,
        redirectUrl,
        {
          dismissButtonStyle: 'cancel',
          enableDefaultShareMenuItem: false,
        }
      ) as WebBrowser.WebBrowserRedirectResult;
      if (result?.url) {
        redirectData = Linking.parse(result.url);
      } else {
        console.warn('SSO session dismissed or failed with type:', result?.type);
      }
      if (redirectData?.queryParams?.credential) {
        try {
          setVisible(true);
          const authCredential = SAMLAuthProvider.credentialFromJSON(
            JSON.parse(redirectData.queryParams.credential as string)
          );
          await signInWithCredential(auth, authCredential);
          router.navigate('/(app)/(tabs)');
        } catch (error) {
          Alert.alert('SSO sign-in failed.');
          console.error('SSO error:', error);
        } finally {
          setVisible(false);
        }
      }
    } catch (error) {
      Alert.alert('SSO session error.');
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.push('/catalog/view-entry')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
       <SnackbarMessage text="Logging in..." visible={visible} setVisible={setVisible} />
      <ScrollView
        contentContainerStyle={containerStyles.scrollViewCenterPadded}
        keyboardShouldPersistTaps="handled"
      >
        <Button style={[buttonStyles.mediumButton, {marginTop:'100%', alignSelf:'center'}]} onPress={_openAuthSessionAsync}>
            <Text style={textStyles.bigButtonText}>Retry Sign In</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SAMLRedirect;
