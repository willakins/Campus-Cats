import React from 'react';

import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import { Login } from '@/components'
import { auth, db } from '@/services/firebase';

const CreateAccount = () => {
  const router = useRouter();

  const validateNewUser = async (username: string, password: string) => {
    // Simple validation
    if (!username || !password) {
      return 'Please enter both username and password';
    }

    const userCredential = await createUserWithEmailAndPassword(auth, username, password);
    const { uid } = userCredential.user;

    await setDoc(doc(db, 'users', uid), { role: 0, name:username }); // Default role: 0 (regular user)

    router.push('/');
    return '';
  };

  const goBack = () => {
    router.push('/login')
  };

  return (
    <Login
      onSubmit={validateNewUser}
      onBack={goBack}
    />
  );
};

export default CreateAccount;
