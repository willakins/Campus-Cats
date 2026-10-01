import React from 'react';

import { useRouter } from 'expo-router';

import { AuthScaffold } from '@/presentation/auth';
import { LoginForm } from '@/presentation/auth/LoginForm';
import { useAuth } from '@/presentation/providers';

const CreateAccount = () => {
  const { createAccount } = useAuth();
  const router = useRouter();

  const createNewUser = async (username: string, password: string) => {
    await createAccount(username, password);
    router.replace('/(app)/(tabs)');
  };

  return (
    <AuthScaffold
      title="Create your account"
      subtitle="Finish setting up the community account approved by a Campus Cats officer."
      onBack={() => router.back()}
    >
      <LoginForm
        onSubmit={createNewUser}
        type="createAccount"
        onSwitchType={router.back}
      />
    </AuthScaffold>
  );
};

export default CreateAccount;
