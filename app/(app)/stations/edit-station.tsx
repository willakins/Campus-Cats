import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppHeader, ErrorState, FormSkeleton, Screen } from '@/components/design';
import { FormScreen, useFormValidation } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { parseUser, roleAccessPolicies, Station } from '@/core/domain';
import { localMedia, storedMedia } from '@/core/media';
import { StoredMediaAsset } from '@/core/ports';
import {
  firstStationErrorField,
  StationForm,
  StationFormData,
  StationFormErrors,
  StationFormSection,
  StationRequiredField,
  stationSectionForField,
  validateStationForm,
} from '@/forms/StationForm';
import { useAuth } from '@/providers';

const validateEditStationForm = ({
  formData,
  profile,
}: {
  formData: StationFormData;
  profile: string;
}): StationFormErrors => {
  const errors = validateStationForm({
    formData,
    photos: profile ? [profile] : [],
  });
  return errors.photos
    ? { ...errors, photos: 'At least one profile photo is required.' }
    : errors;
};

const EditStation = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [station, setStation] = useState<Station>();
  const [storedAssets, setStoredAssets] = useState<readonly StoredMediaAsset[]>([]);
  const [profile, setProfile] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [formData, setFormData] = useState<StationFormData>({
    name: '', location: { latitude: 0, longitude: 0 }, lastStocked: new Date(), stockingFreq: 7, knownCats: '',
  });
  const validation = useFormValidation<
    StationFormSection,
    StationRequiredField,
    StationFormErrors
  >({
    errors: validateEditStationForm({ formData, profile }),
    firstError: firstStationErrorField,
    sectionForField: stationSectionForField,
  });

  useEffect(() => {
    if (!id) {
      setLoadError('Missing station ID');
      return;
    }
    void Promise.all([appModules.stations.get(id), appModules.stations.media(id)]).then(
      ([stationResult, mediaResult]) => {
        if (!stationResult.ok) {
          setLoadError(stationResult.error.message);
          return;
        }
        const loaded = stationResult.value;
        setStation(loaded);
        setFormData({
          name: loaded.name,
          location: loaded.location,
          lastStocked: loaded.lastStocked,
          stockingFreq: loaded.stockingFreq,
          knownCats: loaded.knownCats,
        });
        if (mediaResult.ok) {
          setStoredAssets(mediaResult.value);
          setProfile(mediaResult.value.find(({ role }) => role === 'profile')?.url ?? '');
          setPhotos(mediaResult.value.filter(({ role }) => role === 'gallery').map(({ url }) => url));
        } else setError(mediaResult.error.message);
      },
    );
  }, [id]);

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
    if (!station || busy) return;
    setError(undefined);
    if (!validation.validate()) return;
    setBusy(true);
    const result = await appModules.stations.update(parseUser(user), station.id, {
      ...formData,
      profile: selectionFor(profile),
      gallery: photos.map(selectionFor),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace({ pathname: '/stations/view-station', params: { id: station.id } });
  };
  const confirmDelete = () => {
    if (!station || busy) return;
    Alert.alert('Delete Station', 'Delete this station forever?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever', style: 'destructive', onPress: () => {
          setBusy(true);
          void appModules.stations.remove(parseUser(user), station.id).then((result) => {
            setBusy(false);
            if (result.ok) router.replace('/stations');
            else setError(result.error.message);
          });
        },
      },
    ]);
  };

  if (!station && !loadError) {
    return (
      <Screen scroll>
        <AppHeader
          title="Edit station"
          eyebrow="Officer operations"
          onBack={() => router.back()}
        />
        <FormSkeleton label="Loading station form" fields={5} />
      </Screen>
    );
  }
  if (!station) {
    return (
      <Screen>
        <AppHeader title="Edit station" onBack={() => router.back()} />
        <ErrorState title="Could not load station" message={loadError || 'Station not found'} />
      </Screen>
    );
  }
  return (
    <FormScreen
      title="Edit station"
      eyebrow="Officer operations"
      access={{ policy: roleAccessPolicies.manageStations, role: user.role }}
      saveLabel="Save Station"
      savingLabel="Saving station…"
      busy={busy}
      error={error}
      scrollRequest={validation.scrollRequest}
      toast={validation.toast}
      onBack={() => router.back()}
      onSave={() => void save()}
      onDelete={confirmDelete}
      deleteLabel="Delete Station"
    >
      <StationForm
        formData={formData}
        setFormData={setFormData}
        photos={photos}
        profile={profile}
        setPhotos={setPhotos}
        onPromotePhoto={promotePhoto}
        onDeletePhoto={removePhoto}
        errors={validation.errors}
        onSectionLayout={validation.onSectionLayout}
        onRequiredFieldLayout={validation.onRequiredFieldLayout}
      />
    </FormScreen>
  );
};

export default EditStation;
