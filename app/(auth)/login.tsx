import { useRouter } from 'expo-router';

import { Login } from '@/components';
import { useAuth } from '@/providers';

const LoginScreen = () => {
  const { login } = useAuth();
  const router = useRouter();

  const validateUser = async (username: string, password: string): Promise<string> => {
    // Simple validation
    if (!username || !password) {
      return 'Please enter both username and password';
    }

    try {
      await login(username, password);
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
