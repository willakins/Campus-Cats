import { useState } from 'react';
import { Image, KeyboardAvoidingView, Text, View } from 'react-native';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, BorderlessButton } from '@/components/ui/Buttons';
import { ControlledInput } from '@/components/ui/TextInput';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

// Login requirements
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormType = z.infer<typeof schema>;

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

  const { handleSubmit, control } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  // Wrap submit function to convert the Promise<String> into just a string
  const submitHandler = async (data: FormType) => {
    try {
      await onSubmit(data.email, data.password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        // TODO: Give proper error messages
        setError(err.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={globalStyles.screen} behavior="padding">
      <Image source={require('@/assets/images/campus_cats_logo.png')} style={containerStyles.logo}/>
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
          {error ? <Text style={textStyles.errorText}>{error}</Text> : null}
        </View>
    </KeyboardAvoidingView>
  );
}