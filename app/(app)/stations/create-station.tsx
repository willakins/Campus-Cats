import React, { useState } from 'react';

import { useRouter } from 'expo-router';

import { FormScreen } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { parseUser } from '@/core/domain';
import { StationForm, StationFormData } from '@/forms/StationForm';
import { useAuth } from '@/providers';

const CreateStation = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState<StationFormData>({
    name: '',
    location: { latitude: 0, longitude: 0 },
    lastStocked: new Date(),
    stockingFreq: 7,
    knownCats: '',
  });

  const createStation = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result = await appModules.stations.create(parseUser(user), { ...formData, photos });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace({ pathname: '/stations/view-station', params: { id: result.value.id } });
  };

  return (
    <FormScreen
      title="Create station"
      eyebrow="Officer operations"
      saveLabel="Create Station"
      savingLabel="Creating station…"
      busy={busy}
      error={error}
      onBack={() => router.back()}
      onSave={() => void createStation()}
    >
      <StationForm
        formData={formData}
        setFormData={setFormData}
        photos={photos}
        setPhotos={setPhotos}
        isCreate
      />
    </FormScreen>
  );
};

export default CreateStation;
