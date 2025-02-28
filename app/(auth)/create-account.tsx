import React from 'react';

import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';

import { Login } from '@/components'
import { db } from '@/services/firebase';
import { useAuth } from '@/providers';

const CreateAccount = () => {
  const { createAccount } = useAuth();
  const router = useRouter();

  const validateNewUser = async (username: string, password: string): Promise<string> => {
    // Simple validation
    if (!username || !password) {
      return 'Please enter both username and password';
    }

    const userCredential = await createAccount(username, password);
    const { uid } = userCredential.user;

    await setDoc(doc(db, 'users', uid), { role: 0, email: username }); // Default role: 0 (regular user)

    router.replace('/');
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
