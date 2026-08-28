import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppHeader, ErrorState, FormSkeleton, Screen } from '@/components/design';
import { FormScreen, useFormValidation } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { parseUser, Sighting } from '@/core/domain';
import { localMedia, storedMedia } from '@/core/media';
import { StoredMediaAsset } from '@/core/ports';
import {
  firstSightingErrorField,
  SightingForm,
  SightingFormData,
  SightingFormErrors,
  SightingFormSection,
  SightingRequiredField,
  sightingSectionForField,
  validateSightingForm,
} from '@/forms/SightingForm';
import { useAuth } from '@/providers';

const timeItems = [
  { label: 'Morning', value: 'Morning' },
  { label: 'Afternoon', value: 'Afternoon' },
  { label: 'Night', value: 'Night' },
];

const validateEditSightingForm = ({
  formData,
  timeOfDay,
  profile,
}: {
  formData: SightingFormData;
  timeOfDay: string;
  profile: string;
}): SightingFormErrors => {
  const errors = validateSightingForm({
    formData,
    timeOfDay,
    photos: profile ? [profile] : [],
    currentDate: new Date(),
  });
  return errors.photos
    ? { ...errors, photos: 'At least one profile photo is required.' }
    : errors;
};

const SightingEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [sighting, setSighting] = useState<Sighting>();
  const [storedAssets, setStoredAssets] = useState<readonly StoredMediaAsset[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [profile, setProfile] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(timeItems);
  const [formData, setFormData] = useState<SightingFormData>({
    name: '',
    info: '',
    fed: false,
    health: false,
    location: { latitude: 0, longitude: 0 },
    date: new Date(),
  });
  const validation = useFormValidation<
    SightingFormSection,
    SightingRequiredField,
    SightingFormErrors
  >({
    errors: validateEditSightingForm({
      formData,
      timeOfDay: value,
      profile,
    }),
    firstError: firstSightingErrorField,
    sectionForField: sightingSectionForField,
  });

  useEffect(() => {
    if (!id) {
      setLoadError('Missing sighting ID');
      return;
    }
    let active = true;
    void Promise.all([
      appModules.sightings.get(parseUser(user), id),
      appModules.sightings.media(id),
    ]).then(([sightingResult, mediaResult]) => {
      if (!active) return;
      if (!sightingResult.ok) {
        setLoadError(sightingResult.error.message);
        return;
      }
      const loaded = sightingResult.value;
      if (loaded.source === 'inaturalist') {
        setLoadError('iNaturalist sightings are read-only in Campus Cats.');
        return;
      }
      setSighting(loaded);
      setValue(loaded.timeOfDay);
      setFormData({
        name: loaded.name,
        info: loaded.info,
        fed: loaded.fed,
        health: loaded.health,
        location: loaded.location,
        date: loaded.date,
      });
      if (mediaResult.ok) {
        const stored = mediaResult.value.filter(
          (asset): asset is StoredMediaAsset => !('kind' in asset),
        );
        setStoredAssets(stored);
        setProfile(stored.find(({ role }) => role === 'profile')?.url ?? '');
        setPhotos(stored.filter(({ role }) => role === 'gallery').map(({ url }) => url));
      } else setError(mediaResult.error.message);
    });
    return () => {
      active = false;
    };
  }, [id, user.id, user.role]);

  const selectionFor = (uri: string) => {
    const stored = storedAssets.find((asset) => asset.url === uri);
    return stored ? storedMedia(stored.id) : localMedia(uri);
  };
  const promotePhoto = (uri: string) => {
    setPhotos((current) => [profile, ...current.filter((photo) => photo !== uri)].filter(Boolean));
    setProfile(uri);
  };
  const removePhoto = (uri: string) => {
    if (uri === profile) setProfile('');
    else setPhotos((current) => current.filter((photo) => photo !== uri));
  };
  const save = async () => {
    if (!sighting || busy) return;
    setError(undefined);
    if (!validation.validate()) return;
    setBusy(true);
    const result = await appModules.sightings.update(parseUser(user), sighting.id, {
      ...formData,
      timeOfDay: value,
      profile: selectionFor(profile),
      gallery: photos.map(selectionFor),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace({
      pathname: '/sighting/view-sighting',
      params: { id: result.value.id },
    });
  };
  const confirmDelete = () => {
    if (!sighting || busy) return;
    Alert.alert('Delete Report', 'Delete this sighting forever?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          void appModules.sightings.remove(parseUser(user), sighting.id).then((result) => {
            setBusy(false);
            if (result.ok) router.replace('/(app)/(tabs)');
            else setError(result.error.message);
          });
        },
      },
    ]);
  };

  if (!sighting && !loadError) {
    return (
      <Screen scroll>
        <AppHeader
          title="Edit sighting"
          eyebrow="Field report"
          onBack={() => router.back()}
        />
        <FormSkeleton label="Loading sighting form" fields={5} />
      </Screen>
    );
  }
  if (!sighting) {
    return (
      <Screen>
        <AppHeader title="Edit sighting" onBack={() => router.back()} />
        <ErrorState title="Could not load sighting" message={loadError || 'Sighting not found'} />
      </Screen>
    );
  }
  return (
    <FormScreen
      title="Edit sighting"
      eyebrow="Field report"
      saveLabel="Save Report"
      savingLabel="Saving report…"
      busy={busy}
      error={error}
      scrollRequest={validation.scrollRequest}
      toast={validation.toast}
      onBack={() => router.back()}
      onSave={() => void save()}
      onDelete={confirmDelete}
      deleteLabel="Delete Report"
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
        profile={profile}
        setPhotos={setPhotos}
        onPromotePhoto={promotePhoto}
        onDeletePhoto={removePhoto}
        isCreate={false}
        errors={validation.errors}
        onSectionLayout={validation.onSectionLayout}
        onRequiredFieldLayout={validation.onRequiredFieldLayout}
      />
    </FormScreen>
  );
};

export default SightingEditScreen;
