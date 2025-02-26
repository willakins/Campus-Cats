import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { Login } from '@/components';
import { auth } from '@/services/firebase';

const LoginScreen = () => {
  const router = useRouter();

  const validateUser = async (username: string, password: string): Promise<string> => {
    // Simple validation
    if (!username || !password) {
      return 'Please enter both username and password';
    }

    try {
      await signInWithEmailAndPassword(auth, username, password);
      router.replace('/(app)/(tabs)');
    } catch (error: any) {
      return error.message;
    }

    return '';
  };

  return (
    <Login
      onSubmit={validateUser}
      onCreateAccount={() => router.push('/create-account')}
      forgotPassword
    />
  );
};

export default LoginScreen;
