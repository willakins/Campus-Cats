import { useState } from 'react';
import { View } from 'react-native';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthTextField } from '@/components/auth';
import { Button, FeedbackBanner } from '@/components/design';
import { useAppTheme } from '@/theme';

// Login requirements
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginDataType = z.infer<typeof loginSchema>;

type LoginProps = {
  onSubmit: (email: string, pass: string) => Promise<unknown> | unknown;
  type: 'login' | 'createAccount';
  onSwitchType?: () => void;
  forgotPassword?: boolean;
};

export const LoginForm: React.FC<LoginProps> = ({
  onSubmit,
  type,
  onSwitchType,
  forgotPassword = false
}) => {
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const theme = useAppTheme();

  const { handleSubmit, control, formState: { errors } } = useForm<LoginDataType>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Wrap submit function to convert the Promise<String> into just a string
  const submitHandler = async (data: LoginDataType) => {
    if (busy) return;
    try {
      setBusy(true);
      setError('');
      await onSubmit(data.email, data.password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <AuthTextField
            label="Email"
            required
            value={field.value}
            error={errors.email?.message}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <AuthTextField
            label="Password"
            required
            value={field.value}
            error={errors.password?.message}
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            onBlur={field.onBlur}
            onChangeText={field.onChange}
          />
        )}
      />
      {error ? <FeedbackBanner message={error} tone="danger" /> : null}
      <Button
        label={type === 'login' ? 'Sign in' : 'Create account'}
        fullWidth
        loading={busy}
        loadingLabel={type === 'login' ? 'Signing in…' : 'Creating account…'}
        onPress={handleSubmit(submitHandler)}
      />
      {onSwitchType ? (
        <Button
          label={type === 'login' ? 'Apply for community access' : 'Go back'}
          variant="tertiary"
          fullWidth
          disabled={busy}
          onPress={onSwitchType}
        />
      ) : null}
    </View>
  );
};
