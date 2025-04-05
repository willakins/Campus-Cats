import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';
import { LoginForm } from '@/forms';
import { useAuth } from '@/providers';
import { containerStyles, globalStyles } from '@/styles';

const LoginScreen = () => {
  const { login } = useAuth();
  const router = useRouter();

  const loginUser = async (username: string, password: string) => {
    await login(username, password);
    router.replace('/(app)/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={globalStyles.screen} behavior="padding">
      <Image source={require('@/assets/images/campus_cats_logo.png')} style={containerStyles.logo}/>
      <LoginForm
        onSubmit={loginUser}
        type="login"
        onSwitchType={() => router.push('/create-account')}
        forgotPassword
      />
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
