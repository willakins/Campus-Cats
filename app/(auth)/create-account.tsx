import React from 'react';

import { useRouter } from 'expo-router';

import { Login } from '@/components'
import { useAuth } from '@/providers';

const CreateAccount = () => {
  const { createAccount } = useAuth();
  const router = useRouter();

  const validateNewUser = async (username: string, password: string): Promise<string> => {
    // Simple validation
    if (!username || !password) {
      return 'Please enter both username and password';
    }

    try {
      await createAccount(username, password);
      router.replace('/(app)/(tabs)');
    } catch (error: any) {
      return error.message;
    }

    return '';
  };

  return (
    <Login
      onSubmit={validateNewUser}
      onBack={router.back}
    />
  );
};

export default CreateAccount;
