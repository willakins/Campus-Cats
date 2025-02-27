import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button, BorderlessButton } from './ui/Buttons';
import { TextInput } from './ui/TextInput';

type LoginProps = {
  onSubmit: (user: string, pass: string) => Promise<string>;
  onCreateAccount?: (... args: any[]) => any;
  onBack?: (... args: any[]) => any;
  forgotPassword?: boolean;
};

export const Login: React.FC<LoginProps> = ({
  onSubmit,
  onCreateAccount,
  onBack,
  forgotPassword = false
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Wrap submit function to convert the Promise<String> into just a string
  const handleSubmit = async () => {
    const err = await onSubmit(username, password);
    if (err) {
      setError(err);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('@/assets/images/campus_cats_logo.png')} style={styles.logo} resizeMode='contain'/>
      <View style={styles.inputContainer}>
        <TextInput 
          placeholder="Email" 
          onChangeText={setUsername}
          keyboardType="email-address" />
        <TextInput 
          placeholder="Password" 
          onChangeText={setPassword}
          secureTextEntry />
        <Button onPress={handleSubmit}>
          {onCreateAccount !== undefined ? 'Sign In' : 'Create Account'}
        </Button>
        {onCreateAccount !== undefined ?
          <Button onPress={onCreateAccount}>
            Create Account
          </Button>
        : null}
        {onBack !== undefined ? <Button onPress={onBack}>Go Back</Button> : null}
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
