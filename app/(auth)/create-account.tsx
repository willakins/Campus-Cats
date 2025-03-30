import React from 'react';

import { useRouter } from 'expo-router';

import { LoginForm } from '@/forms'
import { useAuth } from '@/providers';

const CreateAccount = () => {
  const { createAccount } = useAuth();
  const router = useRouter();

  const createNewUser = async (username: string, password: string) => {
    await createAccount(username, password);
    router.replace('/(app)/(tabs)');
  };

  return (
    <LoginForm
      onSubmit={createNewUser}
      type='createAccount'
      onSwitchType={router.back}
    />
  );
};

export default CreateAccount;
