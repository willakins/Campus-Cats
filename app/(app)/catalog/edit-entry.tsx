import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppHeader, ErrorState, Screen } from '@/components/design';
import { FormScreen } from '@/components/forms';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { appModules } from '@/composition/appModules';
import { Cat, CatalogEntry, CatStatus, Fur, parseUser, Sex, TNRStatus } from '@/core/domain';
import { localMedia, storedMedia } from '@/core/media';
import { StoredMediaAsset } from '@/core/ports';
import { CatalogForm, CatalogFormData } from '@/forms/CatalogForm';
import { useAuth } from '@/providers';
import { PickerConfig } from '@/types';

const statusItems = ['Adopted', 'Deceased', 'Feral', 'Frat Cat', 'Unknown'].map((value) => ({ label: value, value }));
const tnrItems = ['Yes', 'No', 'Unknown'].map((value) => ({ label: value, value }));
const sexItems = ['Male', 'Female', 'Unknown'].map((value) => ({ label: value, value }));
const furItems = ['Short', 'Medium', 'Long', 'Unknown'].map((value) => ({ label: value, value }));

const EditEntry = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [entry, setEntry] = useState<CatalogEntry>();
  const [storedAssets, setStoredAssets] = useState<readonly StoredMediaAsset[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [profile, setProfile] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [statusValue, setStatusValue] = useState<CatStatus>('Unknown');
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusOptions, setStatusOptions] = useState(statusItems);
  const [tnrValue, setTnrValue] = useState<TNRStatus>('Unknown');
  const [tnrOpen, setTnrOpen] = useState(false);
  const [tnrOptions, setTnrOptions] = useState(tnrItems);
  const [sexValue, setSexValue] = useState<Sex>('Unknown');
  const [sexOpen, setSexOpen] = useState(false);
  const [sexOptions, setSexOptions] = useState(sexItems);
  const [furValue, setFurValue] = useState<Fur>('Unknown');
  const [furOpen, setFurOpen] = useState(false);
  const [furOptions, setFurOptions] = useState(furItems);
  const [formData, setFormData] = useState<CatalogFormData>({
    name: '', descShort: '', descLong: '', colorPattern: '', behavior: '',
    yearsRecorded: '', AoR: '', furPattern: '', credits: '',
  });
  const pickers = {
    statusPicker: { value: statusValue, setValue: setStatusValue, open: statusOpen, setOpen: setStatusOpen, items: statusOptions, setItems: setStatusOptions } as PickerConfig<CatStatus>,
    tnrPicker: { value: tnrValue, setValue: setTnrValue, open: tnrOpen, setOpen: setTnrOpen, items: tnrOptions, setItems: setTnrOptions } as PickerConfig<TNRStatus>,
    sexPicker: { value: sexValue, setValue: setSexValue, open: sexOpen, setOpen: setSexOpen, items: sexOptions, setItems: setSexOptions } as PickerConfig<Sex>,
    furPicker: { value: furValue, setValue: setFurValue, open: furOpen, setOpen: setFurOpen, items: furOptions, setItems: setFurOptions } as PickerConfig<Fur>,
  };

  useEffect(() => {
    if (!id) {
      setLoadError('Missing catalog entry ID');
      return;
    }
    void Promise.all([appModules.catalog.get(id), appModules.catalog.media(id)]).then(
      ([entryResult, mediaResult]) => {
        if (!entryResult.ok) {
          setLoadError(entryResult.error.message);
          return;
        }
        const loaded = entryResult.value;
        setEntry(loaded);
        setFormData({
          name: loaded.cat.name,
          descShort: loaded.cat.descShort,
          descLong: loaded.cat.descLong,
          colorPattern: loaded.cat.colorPattern,
          behavior: loaded.cat.behavior,
          yearsRecorded: loaded.cat.yearsRecorded,
          AoR: loaded.cat.AoR,
          furPattern: loaded.cat.furPattern,
          credits: loaded.credits,
        });
        setStatusValue(loaded.cat.currentStatus);
        setTnrValue(loaded.cat.tnr);
        setSexValue(loaded.cat.sex);
        setFurValue(loaded.cat.furLength);
        if (mediaResult.ok) {
          setStoredAssets(mediaResult.value);
          setProfile(mediaResult.value.find(({ role }) => role === 'profile')?.url ?? '');
          setPhotos(mediaResult.value.filter(({ role }) => role === 'gallery').map(({ url }) => url));
        } else setError(mediaResult.error.message);
      },
    );
  }, [id]);
  const cat = (): Cat => ({ ...formData, currentStatus: statusValue, furLength: furValue, tnr: tnrValue, sex: sexValue });
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
    if (!entry || busy) return;
    if (!profile) {
      setError('Please select a profile photo.');
      return;
    }
    setBusy(true);
    setError(undefined);
    const result = await appModules.catalog.update(parseUser(user), entry.id, {
      cat: cat(), credits: formData.credits, profile: selectionFor(profile), gallery: photos.map(selectionFor),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace({ pathname: '/catalog/view-entry', params: { id: entry.id } });
  };
  const confirmDelete = () => {
    if (!entry || busy) return;
    Alert.alert('Delete Catalog Entry', 'Delete this entry forever?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever', style: 'destructive', onPress: () => {
          setBusy(true);
          void appModules.catalog.remove(parseUser(user), entry.id).then((result) => {
            setBusy(false);
            if (result.ok) router.replace('/catalog');
            else setError(result.error.message);
          });
        },
      },
    ]);
  };

  if (!entry && !loadError) return <LoadingIndicator label="Loading catalog form" />;
  if (!entry) {
    return (
      <Screen>
        <AppHeader title="Edit catalog entry" onBack={() => router.back()} />
        <ErrorState title="Could not load entry" message={loadError || 'Catalog entry not found'} />
      </Screen>
    );
  }
  return (
    <FormScreen
      title="Edit catalog entry"
      eyebrow="Campus field guide"
      saveLabel="Save Entry"
      savingLabel="Saving entry…"
      busy={busy}
      error={error}
      onBack={() => router.back()}
      onSave={() => void save()}
      onDelete={confirmDelete}
      deleteLabel="Delete Catalog Entry"
    >
      <CatalogForm
        formData={formData}
        setFormData={setFormData}
        pickers={pickers}
        photos={photos}
        profile={profile}
        setPhotos={setPhotos}
        onPromotePhoto={promotePhoto}
        onDeletePhoto={removePhoto}
        isCreate={false}
      />
    </FormScreen>
  );
};

export default EditEntry;
