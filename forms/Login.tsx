import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { ControlledInput } from './controls';
import { zodResolver } from '@hookform/resolvers/zod';
import { FirebaseError } from 'firebase/app';
import { z } from 'zod';

import { Button } from '@/components';
import { Errorbar } from '@/components';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
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
  onSwitchType?: (...args: any[]) => any;
  forgotPassword?: boolean;
};

export const LoginForm: React.FC<LoginProps> = ({
  onSubmit,
  type,
  onSwitchType,
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
      <View style={containerStyles.smallInputContainer}>
        <ControlledInput
          style={textStyles.input}
          control={control}
          name="email"
        />
      </View>
      <Text style={textStyles.label}>Password</Text>
      <View style={containerStyles.smallInputContainer}>
        <ControlledInput control={control} name="password" secureTextEntry />
      </View>
      <Button
        style={buttonStyles.mediumButton}
        onPress={handleSubmit(submitHandler)}
      >
        <Text style={textStyles.bigButtonText}>
          {type === 'login' ? 'Sign In' : 'Create Account'}
        </Text>
      </Button>
      {onSwitchType !== undefined ? (
        <Button style={buttonStyles.mediumButton} onPress={onSwitchType}>
          <Text style={textStyles.bigButtonText}>
            {type === 'login' ? 'Apply For Whitelist' : 'Go Back'}
          </Text>
        </Button>
      ) : null}
      <Errorbar error={error} onDismiss={() => setError('')} />
    </View>
  );
};
