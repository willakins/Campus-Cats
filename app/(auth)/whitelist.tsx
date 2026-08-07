import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthScaffold, AuthTextField } from '@/components/auth';
import { Button, FeedbackBanner, FormSection } from '@/components/design';
import { appModules } from '@/composition/appModules';
import { useUniversitySelection } from '@/providers';

const Whitelist = () => {
  const router = useRouter();
  const { university } = useUniversitySelection();
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
    <AuthScaffold
      title="Community access"
      subtitle={`Alumni and community volunteers can ask a ${university?.club?.name ?? 'club'} officer to review an account request.`}
      onBack={() => router.back()}
    >
      <FormSection title="Your information">
        <AuthTextField
          label="Full name"
          required
          value={formData.name}
          autoComplete="name"
          onChangeText={(text) => handleChange('name', text)}
        />
        <AuthTextField
          label="Graduation year"
          required
          value={formData.graduationYear}
          inputMode="numeric"
          keyboardType="number-pad"
          onChangeText={(text) => handleChange('graduationYear', text)}
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
          label="Officer security word"
          helper="Optional—leave blank if an officer did not give you one."
          value={formData.codeWord}
          onChangeText={(text) => handleChange('codeWord', text)}
        />
      </FormSection>
      {error ? <FeedbackBanner message={error} tone="danger" /> : null}
      <Button
        label="Submit application"
        fullWidth
        loading={busy}
        loadingLabel="Submitting…"
        onPress={() => void submit()}
      />
    </AuthScaffold>
  );
};

export default Whitelist;
