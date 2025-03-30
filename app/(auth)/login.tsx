import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';

import { LoginForm } from '@/forms';
import { useAuth } from '@/providers';

const LoginScreen = () => {
  const { login } = useAuth();
  const router = useRouter();

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFirebaseAuthError = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/user-not-found':
      case 'auth/invalid-credential': // Firebase now often returns this instead of user-not-found
        return 'No user found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Invalid email format.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/internal-error':
        return 'Internal error. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        console.warn('Unhandled auth error:', errorCode);
        return 'Login failed. Please check your credentials.';
    }
  };

  const loginUser = async (username: string, password: string) => {
    try {
      await login(username, password);
      router.replace('/(app)/(tabs)');
    } catch (error: any) {
      console.log('Login error details:', {
        code: error.code,
        message: error.message,
        fullError: error,
      });

      const friendlyMessage = handleFirebaseAuthError(error.code);
      setErrorMessage(friendlyMessage);
      setErrorVisible(true);
    }
  };

  return (
    <>
      <LoginForm
        onSubmit={loginUser}
        type="login"
        onSwitchType={() => router.push('/create-account')}
        forgotPassword
      />
      <Snackbar
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: () => setErrorVisible(false),
        }}
      >
        {errorMessage}
      </Snackbar>
    </>
  );
};

export default LoginScreen;
