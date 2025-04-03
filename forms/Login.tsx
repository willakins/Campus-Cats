import { useState } from 'react';
import { View } from 'react-native';

import { FirebaseError } from 'firebase/app';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, BorderlessButton } from '@/components';
import { ControlledInput } from './controls';
import { textStyles, containerStyles } from '@/styles';
import { Errorbar } from '@/components';
import { handleFirebaseAuthError } from '@/utils';

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
      <Errorbar error={error} onDismiss={() => setError('')} />
    </View>
  );
}
