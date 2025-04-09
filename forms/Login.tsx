import { useState } from 'react';
import { View, Text } from 'react-native';

import { FirebaseError } from 'firebase/app';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, BorderlessButton } from '@/components';
import { ControlledInput } from './controls';
import { textStyles, containerStyles, globalStyles, buttonStyles } from '@/styles';
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
    <View style={containerStyles.shadedCard}>
      <Text style={textStyles.label}>Email</Text>
      <View style={containerStyles.inputContainer}>
        <ControlledInput style={textStyles.input}control={control} name="email"/>
      </View>
      <Text style={textStyles.label}>Password</Text>
      <View style={containerStyles.inputContainer}>
        <ControlledInput control={control} name="password" secureTextEntry />
      </View>
      <Button style={buttonStyles.button2}onPress={handleSubmit(submitHandler)}>
        <Text style={textStyles.bigButtonText}>{type === 'login' ? 'Sign In' : 'Create Account'}</Text>
      </Button>
      {onSwitchType !== undefined ?
        <Button style={buttonStyles.button2}onPress={onSwitchType}>
          <Text style={textStyles.bigButtonText}>{type === 'login' ? 'Apply For Whitelist' : 'Go Back'}</Text>
        </Button>
        : null}
      <Errorbar error={error} onDismiss={() => setError('')} />
    </View>
  );
}
