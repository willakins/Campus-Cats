import { useState } from 'react';
import { View } from 'react-native';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Portal, Snackbar } from 'react-native-paper';
import { z } from 'zod';

import { Button, BorderlessButton } from '@/components';
import { ControlledInput } from './controls';
import { textStyles, containerStyles } from '@/styles';
import { FirebaseError } from 'firebase/app';

// Login requirements
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginDataType = z.infer<typeof loginSchema>;

type LoginProps = {
  onSubmit: (email: string, pass: string) => any;
  type: 'login' | 'createAccount';
  onSwitchType?: (... args: any[]) => any;
  forgotPassword?: boolean;
};

const handleFirebaseAuthError = (errorCode: string) => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No user found with this email.';
    case 'auth/invalid-credential':
      // Firebase now often returns this instead of user-not-found
      return 'Login failed. Incorrect email or password.';
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
      return 'Login failed.';
  }
};

export const LoginForm: React.FC<LoginProps> = ({
  onSubmit,
  type,
  onSwitchType,
  forgotPassword = false
}) => {
  const [error, setError] = useState<string>('');

  const { handleSubmit, control } = useForm<LoginDataType>({
    resolver: zodResolver(loginSchema),
  });

  // Wrap submit function to convert the Promise<String> into just a string
  const submitHandler = async (data: LoginDataType) => {
    try {
      await onSubmit(data.email, data.password);
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        const friendlyMessage = handleFirebaseAuthError(err.code);
        setError(friendlyMessage);
      } else {
        setError('Unknown error.');
      }
    }
  };

  return (
    <View style={containerStyles.loginContainer}>
      <ControlledInput control={control} name="email" label="Email" />
      <ControlledInput control={control} name="password" label="Password" secureTextEntry />
      <Button onPress={handleSubmit(submitHandler)}>
        {type === 'login' ? 'Sign In' : 'Create Account'}
      </Button>
      {onSwitchType !== undefined ?
        <Button onPress={onSwitchType}>
          {type === 'login' ? 'Create Account' : 'Go Back'}
        </Button>
        : null}
      {forgotPassword ?
        <BorderlessButton
          onPress={() => alert("Contact an Administrator")}
          textStyle={textStyles.forgotPassword}>
          Forgot password?
        </BorderlessButton>
        : null}
      <Portal>
        <Snackbar
          visible={!!error}
          onDismiss={() => setError('')}
          duration={3000}
          action={{
            label: 'Dismiss',
            onPress: () => setError(''),
          }}
        >
          {error}
        </Snackbar>
      </Portal>
    </View>
  );
}
