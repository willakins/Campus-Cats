import React from 'react';
import { Image, KeyboardAvoidingView } from 'react-native';

import { useRouter } from 'expo-router';

import { LoginForm } from '@/forms';
import { useAuth } from '@/providers';
import { containerStyles, globalStyles } from '@/styles';

const CreateAccount = () => {
  const { createAccount } = useAuth();
  const router = useRouter();

  const createNewUser = async (username: string, password: string) => {
    await createAccount(username, password);
    router.replace('/(app)/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={globalStyles.screen} behavior="padding">
      <Image
        source={require('@/assets/images/campus_cats_logo.png')}
        style={containerStyles.logo}
      />
      <LoginForm
        onSubmit={createNewUser}
        type="createAccount"
        onSwitchType={router.back}
      />
    </KeyboardAvoidingView>
  );
};

export default CreateAccount;
