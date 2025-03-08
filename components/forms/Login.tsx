import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, BorderlessButton } from '@/components/ui/Buttons';
import { ControlledInput } from '@/components/ui/TextInput';

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
    <View style={styles.container}>
      <Image source={require('@/assets/images/campus_cats_logo.png')} style={styles.logo} resizeMode='contain'/>
      <View style={styles.inputContainer}>
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
            textStyle={styles.forgotPassword}>
            Forgot password?
          </BorderlessButton>
        : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff', 
  },
  logo: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  inputContainer: {
    width: '80%',
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 10,
    elevation: 3,  // Adds shadow on Android
    shadowColor: '#000',  // Adds shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  forgotPassword: {
    marginTop: 10,
    color: '#007BFF',
    fontSize: 14,
    fontWeight: 'normal',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
});
