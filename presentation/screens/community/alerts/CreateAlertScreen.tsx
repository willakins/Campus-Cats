import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useRouter } from 'expo-router';

import { FormScreen } from '@/presentation/forms';
import { appModules } from '@/composition/appModules';
import { parseUser, roleAccessPolicies } from '@/core/domain';
import {
  AlertForm,
  AlertFormData,
  AlertFormErrors,
  AlertFormSection,
  AlertRequiredField,
  firstAlertErrorField,
  validateAlertForm,
} from '@/presentation/screens/community/alerts/forms/AlertForm';
import { useAuth } from '@/presentation/providers/AuthProvider';

const CreateAlert = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] =
    useState<AlertFormErrors>({});
  const [toast, setToast] = useState<{ id: number; message: string }>();
  const [scrollRequest, setScrollRequest] = useState<{
    id: number;
    y: number;
  }>();
  const validationAttempt = useRef(0);
  const sectionOffsets = useRef<
    Partial<Record<AlertFormSection, number>>
  >({});
  const fieldOffsets = useRef<
    Partial<
      Record<
        AlertRequiredField,
        { section: AlertFormSection; y: number }
      >
    >
  >({});
  const [formData, setFormData] = useState<AlertFormData>({
    title: '',
    info: '',
    authorAlias: '',
  });

  useEffect(() => {
    if (validationAttempt.current === 0) return;
    setValidationErrors(validateAlertForm(formData));
  }, [formData]);

  const createAlert = async () => {
    if (busy) return;
    setError(undefined);
    const nextErrors = validateAlertForm(formData);
    const firstError = firstAlertErrorField(nextErrors);
    if (firstError) {
      const id = ++validationAttempt.current;
      setValidationErrors(nextErrors);
      setToast({ id, message: 'Please fill in the missing information.' });
      const fieldOffset = fieldOffsets.current[firstError];
      setScrollRequest({
        id,
        y: (sectionOffsets.current.basics ?? 0) + (fieldOffset?.y ?? 0),
      });
      return;
    }
    setValidationErrors({});
    setBusy(true);
    const result = await appModules.alerts.create(parseUser(user), {
      ...formData,
      photos,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    if (result.warnings.length > 0) {
      Alert.alert('Alert created', result.warnings[0].message);
    }
    router.replace({
      pathname: '/community',
      params: { section: 'alerts' },
    });
  };

  return (
    <FormScreen
      title="Create alert"
      eyebrow="Campus Cats update"
      access={{ policy: roleAccessPolicies.manageAlerts, role: user.role }}
      saveLabel="Create Alert"
      savingLabel="Creating alert…"
      busy={busy}
      error={error}
      scrollRequest={scrollRequest}
      toast={toast}
      onBack={() => router.back()}
      onSave={() => void createAlert()}
    >
      <AlertForm
        formData={formData}
        setFormData={setFormData}
        photos={photos}
        setPhotos={setPhotos}
        errors={validationErrors}
        onSectionLayout={(section, y) => {
          sectionOffsets.current[section] = y;
        }}
        onRequiredFieldLayout={(field, section, y) => {
          fieldOffsets.current[field] = { section, y };
        }}
      />
    </FormScreen>
  );
};

export default CreateAlert;
