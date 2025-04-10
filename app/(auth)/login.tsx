import { Image, SafeAreaView, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
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
    <SafeAreaView style={globalStyles.screen}>
      <ScrollView contentContainerStyle={containerStyles.scrollViewCenter}
  keyboardShouldPersistTaps="handled">
        <Image source={require('@/assets/images/campus_cats_logo.png')} style={containerStyles.imageLarge}/>
        <LoginForm
          onSubmit={loginUser}
          type="login"
          onSwitchType={() => router.push('/whitelist')}
          forgotPassword
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;
