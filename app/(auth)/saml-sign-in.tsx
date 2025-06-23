import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { SAMLAuthProvider, getAuth, signInWithCredential } from 'firebase/auth';

import { Button, SnackbarMessage } from '@/components';
import { firebaseConfig } from '@/config/firebase';
import { fetchUser, mutateUser } from '@/models';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import {
  registerForPushNotificationsAsync,
  savePushTokenToFirestore,
} from '@/utils/notifications';

const SAMLRedirect = () => {
  const router = useRouter();
  const auth = getAuth();
  const redirectUrl = Linking.createURL('/saml-sign-in');
  const backendUrl =
    'https://campuscats-d7a5e.firebaseapp.com/firebase-wrapper-app.html';
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    _openAuthSessionAsync();
  }, []);

  const _openAuthSessionAsync = async () => {
    try {
      let redirectData: Linking.ParsedURL | null = null;
      const result = (await WebBrowser.openAuthSessionAsync(
        `${backendUrl}?linkingUri=${redirectUrl}&apiKey=${firebaseConfig.apiKey}&authDomain=${firebaseConfig.authDomain}`,
        redirectUrl,
        {
          dismissButtonStyle: 'cancel',
          enableDefaultShareMenuItem: false,
        },
      )) as WebBrowser.WebBrowserRedirectResult;
      if (result?.url) {
        redirectData = Linking.parse(result.url);
      } else {
        console.warn(
          'SSO session dismissed or failed with type:',
          result?.type,
        );
      }
      if (redirectData?.queryParams?.credential) {
        try {
          setVisible(true);
          const authCredential = SAMLAuthProvider.credentialFromJSON(
            JSON.parse(redirectData.queryParams.credential as string),
          );
          const userCred = await signInWithCredential(auth, authCredential);
          if (userCred?.user?.uid && userCred?.user?.email) {
            await fetchUser(userCred.user.uid, userCred.user.email);

            const token = await registerForPushNotificationsAsync();
            if (token) {
              await savePushTokenToFirestore(userCred.user.uid, token);
            }
          } else {
            console.error('User cred error');
          }
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
      <Button
        style={buttonStyles.smallButtonTopLeft}
        onPress={() => router.push('/catalog/view-entry')}
      >
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage
        text="Logging in..."
        visible={visible}
        setVisible={setVisible}
      />
      <ScrollView
        contentContainerStyle={containerStyles.scrollViewCenterPadded}
        keyboardShouldPersistTaps="handled"
      >
        <Button
          style={[
            buttonStyles.mediumButton,
            { marginTop: '100%', alignSelf: 'center' },
          ]}
          onPress={_openAuthSessionAsync}
        >
          <Text style={textStyles.bigButtonText}>Retry Sign In</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SAMLRedirect;
