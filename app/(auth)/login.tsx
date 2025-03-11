import { useRouter } from 'expo-router';

import { LoginForm } from '@/components';
import { useAuth } from '@/providers';

const LoginScreen = () => {
  const { login } = useAuth();
  const router = useRouter();

  const loginUser = async (username: string, password: string) => {
    await login(username, password);
    router.replace('/(app)/(tabs)');
  };

  return (
    <LoginForm
      onSubmit={loginUser}
      type='login'
      onSwitchType={() => router.push('/create-account')}
      forgotPassword
    />
  );
};
export default LoginScreen;