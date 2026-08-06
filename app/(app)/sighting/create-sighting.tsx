import React, { useState } from 'react';

import { useRouter } from 'expo-router';

import { FormScreen } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { parseUser } from '@/core/domain';
import { SightingForm, SightingFormData } from '@/forms/SightingForm';
import { useAuth } from '@/providers';

const timeItems = [
  { label: 'Morning', value: 'Morning' },
  { label: 'Afternoon', value: 'Afternoon' },
  { label: 'Night', value: 'Night' },
];

const SightingCreateScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(timeItems);
  const [photos, setPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState<SightingFormData>({
    name: '',
    info: '',
    fed: false,
    health: false,
    location: { latitude: 0, longitude: 0 },
    date: new Date(),
  });

  const createSighting = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const actor = parseUser(user);
    const result = await appModules.sightings.create(actor, {
      ...formData,
      timeOfDay: value,
      photos,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await appModules.profiles.sync(actor);
    router.replace({
      pathname: '/sighting/view-sighting',
      params: { id: result.value.id },
    });
  };

  return (
    <FormScreen
      title="Report a sighting"
      eyebrow="New field report"
      saveLabel="Create Report"
      savingLabel="Creating report…"
      busy={busy}
      error={error}
      onBack={() => router.push('/(app)/(tabs)')}
      onSave={() => void createSighting()}
    >
      <SightingForm
        formData={formData}
        setFormData={setFormData}
        value={value}
        setValue={setValue}
        open={open}
        setOpen={setOpen}
        items={items}
        setItems={setItems}
        photos={photos}
        setPhotos={setPhotos}
        isCreate
      />
    </FormScreen>
  );
};

export default SightingCreateScreen;
