import { useState } from 'react';
import { Alert } from 'react-native';

import { useRouter } from 'expo-router';

import { FormScreen } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { parseUser } from '@/core/domain';
import { AnnouncementForm, AnnouncementFormData } from '@/forms/AnnouncementForm';
import { useAuth } from '@/providers/AuthProvider';

const CreateAnnouncement = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    info: '',
    authorAlias: '',
  });

  const createAnnouncement = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
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
      saveLabel="Create Announcement"
      savingLabel="Creating announcement…"
      busy={busy}
      error={error}
      onBack={() => router.back()}
      onSave={() => void createAnnouncement()}
    >
      <AnnouncementForm
        formData={formData}
        setFormData={setFormData}
        photos={photos}
        setPhotos={setPhotos}
      />
    </FormScreen>
  );
};

export default CreateAnnouncement;
