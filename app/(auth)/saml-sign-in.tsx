import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import * as Linking from "expo-linking";
import { useRouter } from 'expo-router';
import * as WebBrowser from "expo-web-browser";
import { getAuth, SAMLAuthProvider, signInWithCredential } from 'firebase/auth';
import { firebaseConfig } from '@/config/firebase';

import { Button } from '@/components';

const SAMLRedirect = () => {
  const router = useRouter();

  const auth = getAuth();
  const backendUrl = 'https://campuscats-d7a5e.firebaseapp.com/firebase-wrapper-app.html';
  const redirectUrl = Linking.createURL("/saml-sign-in");

  const [redirectData, setRedirectData] = useState<Linking.ParsedURL | null>(null);

  // When redirectData is updated, check to see if it exists, if so try to sign in using it
  useEffect(() => {
    if (redirectData?.queryParams?.credential) {
      const authCredential = SAMLAuthProvider.credentialFromJSON(
        JSON.parse(redirectData.queryParams.credential as string)
      );
      signInWithCredential(auth, authCredential).catch(alert);
      router.replace('/(app)/(tabs)');
    }
  }, [redirectData]);

  const _openAuthSessionAsync = async () => {
    try {
      let result = await WebBrowser.openAuthSessionAsync(
        backendUrl +
          `?linkingUri=${redirectUrl}&apiKey=${
            firebaseConfig["apiKey"]
          }&authDomain=${firebaseConfig["authDomain"]}`,
        redirectUrl,
        { dismissButtonStyle: "cancel", enableDefaultShareMenuItem: false }
      ) as WebBrowser.WebBrowserRedirectResult;
      console.log(result.type);
      if (result?.url) {
        // You can check why no url would have been returned with result.type
        setRedirectData(Linking.parse(result.url));
      }
    } catch (error) {
      alert(error);
      console.log(error);
    }
  };

  return (
    <Button onPress={_openAuthSessionAsync}>
      Sign in using SSO
    </Button>
  );
};

export default SAMLRedirect;
