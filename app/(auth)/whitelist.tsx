import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthTextField } from '@/presentation/auth';
import {
  AppText,
  Button,
  FeedbackBanner,
  IconButton,
  Screen,
} from '@/presentation/ui';
import { appModules } from '@/composition/appModules';
import { useUniversitySelection } from '@/presentation/providers';
import { useAppTheme } from '@/theme';

const Whitelist = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { university } = useUniversitySelection();
  const saml = university?.club?.saml;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [formData, setFormData] = useState({
    name: '',
    graduationYear: '',
    email: '',
    codeWord: '',
  });
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };
  const submit = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setError(undefined);
      const result = await appModules.whitelist.submit(formData);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      Alert.alert(
        'Application submitted',
        'An officer will review it and email you if it is accepted.',
      );
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      scroll
      keyboardAware
      contentStyle={{ paddingBottom: theme.spacing.huge }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: theme.layout.maxAuthWidth,
          alignSelf: 'center',
          gap: theme.spacing.xl,
          paddingTop: theme.spacing.lg,
        }}
      >
        <IconButton
          accessibilityLabel="Back"
          icon="arrow-back"
          onPress={() => router.back()}
        />

        <View style={{ gap: theme.spacing.xs }}>
          <AppText accessibilityRole="header" variant="pageTitle">
            Request community access
          </AppText>
          <AppText color="muted">
            For alumni and community members without a university account.
          </AppText>
        </View>

        {saml ? (
          <View
            style={{
              gap: theme.spacing.sm,
              padding: theme.spacing.lg,
              borderRadius: theme.radii.card,
              backgroundColor: theme.colors.primarySurface,
            }}
          >
            <AppText variant="cardTitle">Current student?</AppText>
            <AppText>
              If you have an active university account, use {saml.label}{' '}
              instead. This form is only for people without access to university
              sign-in.
            </AppText>
            <Button
              label={`Use ${saml.label}`}
              variant="tertiary"
              icon="school-outline"
              disabled={busy}
              style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}
              onPress={() => router.navigate('/saml-sign-in')}
            />
          </View>
        ) : null}

        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xxs }}>
            <AppText variant="section">Tell us about yourself</AppText>
            <AppText color="muted">
              A {university?.club?.name ?? 'club'} officer will review your
              request before you can create an account.
            </AppText>
          </View>
          <AuthTextField
            label="Full name"
            required
            value={formData.name}
            autoComplete="name"
            onChangeText={(text) => handleChange('name', text)}
          />
          <AuthTextField
            label="Email"
            required
            value={formData.email}
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
            keyboardType="email-address"
            onChangeText={(text) => handleChange('email', text)}
          />
          <AuthTextField
            label="Graduation year"
            value={formData.graduationYear}
            inputMode="numeric"
            keyboardType="number-pad"
            onChangeText={(text) => handleChange('graduationYear', text)}
          />
          <AuthTextField
            label="Officer security word"
            helper="Optional—leave blank if an officer did not give you one."
            value={formData.codeWord}
            onChangeText={(text) => handleChange('codeWord', text)}
          />
          {error ? <FeedbackBanner message={error} tone="danger" /> : null}
          <Button
            label="Submit application"
            fullWidth
            loading={busy}
            loadingLabel="Submitting…"
            style={{ minHeight: 56, marginTop: theme.spacing.xs }}
            onPress={() => void submit()}
          />
        </View>
      </View>
    </Screen>
  );
};

export default Whitelist;
