import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useRouter } from 'expo-router';

import { FormScreen } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { parseUser, roleAccessPolicies } from '@/core/domain';
import {
  AnnouncementForm,
  AnnouncementFormData,
  AnnouncementFormErrors,
  AnnouncementFormSection,
  AnnouncementRequiredField,
  firstAnnouncementErrorField,
  validateAnnouncementForm,
} from '@/forms/AnnouncementForm';
import { useAuth } from '@/providers/AuthProvider';

const CreateAnnouncement = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] =
    useState<AnnouncementFormErrors>({});
  const [toast, setToast] = useState<{ id: number; message: string }>();
  const [scrollRequest, setScrollRequest] = useState<{
    id: number;
    y: number;
  }>();
  const validationAttempt = useRef(0);
  const sectionOffsets = useRef<
    Partial<Record<AnnouncementFormSection, number>>
  >({});
  const fieldOffsets = useRef<
    Partial<
      Record<
        AnnouncementRequiredField,
        { section: AnnouncementFormSection; y: number }
      >
    >
  >({});
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    info: '',
    authorAlias: '',
  });

  useEffect(() => {
    if (validationAttempt.current === 0) return;
    setValidationErrors(validateAnnouncementForm(formData));
  }, [formData]);

  const createAnnouncement = async () => {
    if (busy) return;
    setError(undefined);
    const nextErrors = validateAnnouncementForm(formData);
    const firstError = firstAnnouncementErrorField(nextErrors);
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
    const result = await appModules.announcements.create(parseUser(user), {
      ...formData,
      photos,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    if (result.warnings.length > 0) {
      Alert.alert('Announcement created', result.warnings[0].message);
    }
    router.replace({
      pathname: '/announcements',
      params: { section: 'announcements' },
    });
  };

  return (
    <FormScreen
      title="Create announcement"
      eyebrow="Campus Cats update"
      access={{ policy: roleAccessPolicies.manageAnnouncements, role: user.role }}
      saveLabel="Create Announcement"
      savingLabel="Creating announcement…"
      busy={busy}
      error={error}
      scrollRequest={scrollRequest}
      toast={toast}
      onBack={() => router.back()}
      onSave={() => void createAnnouncement()}
    >
      <AnnouncementForm
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

export default CreateAnnouncement;
