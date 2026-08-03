import React, { useEffect, useState } from 'react';
import { Alert, FlatList, SafeAreaView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, LoadingIndicator, SnackbarMessage } from '@/components';
import { appModules } from '@/composition/appModules';
import {
  Cat,
  CatalogEntry,
  CatStatus,
  Fur,
  Sex,
  TNRStatus,
  parseUser,
} from '@/core/domain';
import { localMedia, storedMedia } from '@/core/media';
import { StoredMediaAsset } from '@/core/ports';
import { CatalogForm } from '@/forms';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { PickerConfig } from '@/types';

const statusItems = [
  { label: 'Adopted', value: 'Adopted' as CatStatus },
  { label: 'Deceased', value: 'Deceased' as CatStatus },
  { label: 'Feral', value: 'Feral' as CatStatus },
  { label: 'Frat Cat', value: 'Frat Cat' as CatStatus },
  { label: 'Unknown', value: 'Unknown' as CatStatus },
];
const tnrItems = [
  { label: 'Yes', value: 'Yes' as TNRStatus },
  { label: 'No', value: 'No' as TNRStatus },
  { label: 'Unknown', value: 'Unknown' as TNRStatus },
];
const sexItems = [
  { label: 'Male', value: 'Male' as Sex },
  { label: 'Female', value: 'Female' as Sex },
  { label: 'Unknown', value: 'Unknown' as Sex },
];
const furItems = [
  { label: 'Short', value: 'Short' as Fur },
  { label: 'Medium', value: 'Medium' as Fur },
  { label: 'Long', value: 'Long' as Fur },
  { label: 'Unknown', value: 'Unknown' as Fur },
];

const EditEntry = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [entry, setEntry] = useState<CatalogEntry>();
  const [storedAssets, setStoredAssets] = useState<readonly StoredMediaAsset[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [profile, setProfile] = useState('');
  const [visible, setVisible] = useState(false);
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
  const [formData, setFormData] = useState({
    name: '',
    descShort: '',
    descLong: '',
    colorPattern: '',
    behavior: '',
    yearsRecorded: '',
    AoR: '',
    furPattern: '',
    credits: '',
  });

  const pickers = {
    statusPicker: {
      value: statusValue,
      setValue: setStatusValue,
      open: statusOpen,
      setOpen: setStatusOpen,
      items: statusOptions,
      setItems: setStatusOptions,
    } as PickerConfig<CatStatus>,
    tnrPicker: {
      value: tnrValue,
      setValue: setTnrValue,
      open: tnrOpen,
      setOpen: setTnrOpen,
      items: tnrOptions,
      setItems: setTnrOptions,
    } as PickerConfig<TNRStatus>,
    sexPicker: {
      value: sexValue,
      setValue: setSexValue,
      open: sexOpen,
      setOpen: setSexOpen,
      items: sexOptions,
      setItems: setSexOptions,
    } as PickerConfig<Sex>,
    furPicker: {
      value: furValue,
      setValue: setFurValue,
      open: furOpen,
      setOpen: setFurOpen,
      items: furOptions,
      setItems: setFurOptions,
    } as PickerConfig<Fur>,
  };

  useEffect(() => {
    if (!id) return;
    void Promise.all([appModules.catalog.get(id), appModules.catalog.media(id)]).then(
      ([entryResult, mediaResult]) => {
        if (!entryResult.ok) {
          Alert.alert('Could not load entry', entryResult.error.message);
          return;
        }
        const loaded = entryResult.value;
        setEntry(loaded);
        setFormData({ ...loaded.cat, credits: loaded.credits });
        setStatusValue(loaded.cat.currentStatus);
        setTnrValue(loaded.cat.tnr);
        setSexValue(loaded.cat.sex);
        setFurValue(loaded.cat.furLength);
        if (mediaResult.ok) {
          setStoredAssets(mediaResult.value);
          setProfile(
            mediaResult.value.find(({ role }) => role === 'profile')?.url ?? '',
          );
          setPhotos(
            mediaResult.value
              .filter(({ role }) => role === 'gallery')
              .map(({ url }) => url),
          );
        }
      },
    );
  }, [id]);

  const cat = (): Cat => ({
    ...formData,
    currentStatus: statusValue,
    furLength: furValue,
    tnr: tnrValue,
    sex: sexValue,
  });
  const selectionFor = (uri: string) => {
    const stored = storedAssets.find((asset) => asset.url === uri);
    return stored ? storedMedia(stored.id) : localMedia(uri);
  };
  const promotePhoto = (uri: string) => {
    setPhotos((current) => [profile, ...current.filter((photo) => photo !== uri)].filter(Boolean));
    setProfile(uri);
  };

  const save = async () => {
    if (!entry || !profile) {
      Alert.alert('Could not save entry', 'Please select a profile photo.');
      return;
    }
    setVisible(true);
    const result = await appModules.catalog.update(parseUser(user), entry.id, {
      cat: cat(),
      credits: formData.credits,
      profile: selectionFor(profile),
      gallery: photos.map(selectionFor),
    });
    setVisible(false);
    if (!result.ok) {
      Alert.alert('Could not save entry', result.error.message);
      return;
    }
    router.replace({ pathname: '/catalog/view-entry', params: { id: entry.id } });
  };

  const confirmDelete = () => {
    if (!entry) return;
    Alert.alert('Delete Catalog Entry', 'Delete this entry forever?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever',
        style: 'destructive',
        onPress: () =>
          void appModules.catalog.remove(parseUser(user), entry.id).then((result) => {
            if (result.ok) router.replace('/catalog');
            else Alert.alert('Could not delete entry', result.error.message);
          }),
      },
    ]);
  };

  if (!entry) return <LoadingIndicator />;

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage text="Saving Entry..." visible={visible} setVisible={setVisible} />
      <Text style={textStyles.pageTitle}>Edit Entry</Text>
      <FlatList
        data={[1]}
        keyExtractor={() => 'catalog-form'}
        contentContainerStyle={containerStyles.scrollView}
        renderItem={() => (
          <CatalogForm
            formData={formData}
            setFormData={setFormData}
            pickers={pickers}
            photos={photos}
            profile={profile}
            setPhotos={setPhotos}
            onPromotePhoto={promotePhoto}
            onDeletePhoto={(uri) =>
              setPhotos((current) => current.filter((photo) => photo !== uri))
            }
            isCreate={false}
          />
        )}
      />
      <Button style={buttonStyles.bigButton} onPress={() => void save()}>
        <Text style={textStyles.bigButtonText}>Save Entry</Text>
      </Button>
      <Button style={buttonStyles.bigDeleteButton} onPress={confirmDelete}>
        <Text style={textStyles.bigButtonText}>Delete Catalog Entry</Text>
      </Button>
    </SafeAreaView>
  );
};

export default EditEntry;
