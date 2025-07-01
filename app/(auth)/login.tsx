import React, { useState } from 'react';
import { Text, Image, View, SafeAreaView, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { firebaseConfig } from '@/config/firebase';
import { auth as firebaseAuth } from '@/config/firebase'; // Get Firebase auth reference

import { Button, SnackbarMessage } from '@/components';
import { buttonStyles, containerStyles, globalStyles, textStyles } from '@/styles';
import { useAuth } from '@/providers';
import { registerForPushNotificationsAsync, savePushTokenToFirestore } from '@/utils/notifications';

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
  
      const token = await registerForPushNotificationsAsync();
      const currentUser = firebaseAuth.currentUser;
  
      if (token && currentUser?.uid) {
        await savePushTokenToFirestore(currentUser.uid, token);
      }
  
      router.replace('/(app)/(tabs)');
    } catch {
      alert('Failed login. Consider using SSO.');
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
          <Button style={buttonStyles.mediumButton} onPress={() => 
            Alert.alert(
                    'Select Option',
                    'Using SSO for the first time currently causes an error. Make sure to click retry sign-on for it to work correctly.',
                    [
                      {
                        text: 'I understand',
                        onPress: () => router.navigate('/saml-sign-in'),
                      },
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                    ],
                    { cancelable: true }
                  )}>
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
