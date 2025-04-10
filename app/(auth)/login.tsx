import React, { useEffect, useState } from 'react';
import { Text, Image, View, SafeAreaView, ScrollView, Alert, TextInput } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { getAuth, SAMLAuthProvider, signInWithCredential } from 'firebase/auth';
import { useRouter } from 'expo-router';

import { firebaseConfig } from '@/config/firebase';
import { Button, SnackbarMessage } from '@/components';
import { buttonStyles, containerStyles, globalStyles, textStyles } from '@/styles';
import { useAuth } from '@/providers';
import { fetchUser, mutateUser } from '@/models';

const LoginScreen = () => {
  const router = useRouter();
  const auth = getAuth();
  const { login } = useAuth();
  const redirectUrl = Linking.createURL('/saml-sign-in');
  const backendUrl = 'https://campuscats-d7a5e.firebaseapp.com/firebase-wrapper-app.html';
  const [redirectData, setRedirectData] = useState<Linking.ParsedURL | null>(null);

  const [visible, setVisible] = useState<boolean>(false);
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

  useEffect(() => {
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
       <SnackbarMessage text="Logging in..." visible={visible} setVisible={setVisible} />
      <ScrollView
        contentContainerStyle={containerStyles.scrollViewCenterPadded}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('@/assets/images/campus_cats_logo.png')}
          style={containerStyles.imageLarge}
        />
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
