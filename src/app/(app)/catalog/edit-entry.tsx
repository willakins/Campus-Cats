import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage } from '@/components';
import { CatalogForm } from '@/forms';
import { CatalogImageHandler } from '@/image_handlers/CatalogImageHandler';
import { useAuth } from '@/providers';
import DatabaseService from '@/services/DatabaseService';
import {
  getSelectedCatalogEntry,
  setSelectedCatalogEntry,
} from '@/stores/CatalogEntryStores';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { PickerConfig } from '@/types';
import {
  Cat,
  CatStatus,
  CatalogEntry,
  Fur,
  Sex,
  TNRStatus,
} from '@/types/CatalogEntry';

const EditEntry = () => {
  const router = useRouter();
  const { user } = useAuth();
  const database = DatabaseService.getInstance();
  const entry = getSelectedCatalogEntry();

  const [photos, setPhotos] = useState<string[]>([]);
  const [profile, setProfile] = useState<string>('');
  const [isPicsChanged, setPicsChanged] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const imageHandler = new CatalogImageHandler({
    type: 'catalog',
    id: entry.id,
    photos,
    profile,
    setPhotos,
    setProfile,
    setPicsChanged,
    setVisible,
  });

  // ---------- Status Picker ----------
  const [statusValue, setStatusValue] = useState<CatStatus>(
    entry.cat.currentStatus,
  );
  const [statusOpen, setStatusOpen] = useState<boolean>(false);
  const [statusItems, setStatusItems] = useState([
    { label: 'Adopted', value: 'Adopted' },
    { label: 'Deceased', value: 'Deceased' },
    { label: 'Feral', value: 'Feral' },
    { label: 'Frat Cat', value: 'Frat Cat' },
    { label: 'Unknown', value: 'Unknown' },
  ]);

  const statusPicker: PickerConfig<CatStatus> = {
    value: statusValue,
    setValue: setStatusValue,
    open: statusOpen,
    setOpen: setStatusOpen,
    items: statusItems,
    setItems: setStatusItems,
  };

  // ---------- TNR Picker ----------
  const [tnrValue, setTnrValue] = useState<TNRStatus>(entry.cat.tnr);
  const [tnrOpen, setTnrOpen] = useState<boolean>(false);
  const [tnrItems, setTnrItems] = useState([
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
    { label: 'Unknown', value: 'Unknown' },
  ]);

  const tnrPicker: PickerConfig<TNRStatus> = {
    value: tnrValue,
    setValue: setTnrValue,
    open: tnrOpen,
    setOpen: setTnrOpen,
    items: tnrItems,
    setItems: setTnrItems,
  };

  // ---------- Sex Picker ----------
  const [sexValue, setSexValue] = useState<Sex>(entry.cat.sex);
  const [sexOpen, setSexOpen] = useState<boolean>(false);
  const [sexItems, setSexItems] = useState([
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Unknown', value: 'Unknown' },
  ]);

  const sexPicker: PickerConfig<Sex> = {
    value: sexValue,
    setValue: setSexValue,
    open: sexOpen,
    setOpen: setSexOpen,
    items: sexItems,
    setItems: setSexItems,
  };

  // ---------- Fur Picker ----------
  const [furValue, setFurValue] = useState<Fur>(entry.cat.furLength);
  const [furOpen, setFurOpen] = useState<boolean>(false);
  const [furItems, setFurItems] = useState([
    { label: 'Short', value: 'Short' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Long', value: 'Long' },
    { label: 'Unknown', value: 'Unknown' },
  ]);

  const furPicker: PickerConfig<Fur> = {
    value: furValue,
    setValue: setFurValue,
    open: furOpen,
    setOpen: setFurOpen,
    items: furItems,
    setItems: setFurItems,
  };

  const pickers = {
    statusPicker,
    tnrPicker,
    sexPicker,
    furPicker,
  };

  const [formData, setFormData] = useState<{
    name: string;
    descShort: string;
    descLong: string;
    colorPattern: string;
    behavior: string;
    yearsRecorded: string;
    AoR: string;
    currentStatus: CatStatus;
    furLength: Fur;
    furPattern: string;
    tnr: TNRStatus;
    sex: Sex;
    credits: string;
  }>({
    name: entry.cat.name,
    descShort: entry.cat.descShort,
    descLong: entry.cat.descLong,
    colorPattern: entry.cat.colorPattern,
    behavior: entry.cat.behavior,
    yearsRecorded: entry.cat.yearsRecorded,
    AoR: entry.cat.AoR,
    currentStatus: entry.cat.currentStatus,
    furLength: entry.cat.furLength,
    furPattern: entry.cat.furPattern,
    tnr: entry.cat.tnr,
    sex: entry.cat.sex,
    credits: entry.credits,
  });

  const createCat = () => {
    const newCat: Cat = {
      name: formData.name,
      descShort: formData.descShort,
      descLong: formData.descLong,
      colorPattern: formData.colorPattern,
      behavior: formData.behavior,
      yearsRecorded: formData.yearsRecorded,
      AoR: formData.AoR,
      currentStatus: pickers.statusPicker.value,
      furLength: pickers.furPicker.value,
      furPattern: formData.furPattern,
      tnr: pickers.tnrPicker.value,
      sex: pickers.sexPicker.value,
    };
    return newCat;
  };

  const createObj = () => {
    const newEntry = new CatalogEntry({
      id: entry.id,
      cat: createCat(),
      credits: formData.credits,
      createdAt: new Date(),
      createdBy: user,
    });
    setSelectedCatalogEntry(newEntry);
  };

  useEffect(() => {
    void database.fetchCatImages(entry.id, setProfile, setPhotos);
    // NOTE: database is a singleton class provided by DatabaseService and
    // will never change; it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button
        style={buttonStyles.smallButtonTopLeft}
        onPress={() => router.push('/catalog/view-entry')}
      >
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage
        text="Saving Entry..."
        visible={visible}
        setVisible={setVisible}
      />
      <Text style={textStyles.pageTitle}>Edit Entry</Text>
      <FlatList
        data={[1]}
        keyExtractor={() => '1'}
        contentContainerStyle={containerStyles.scrollView}
        renderItem={() => (
          <CatalogForm
            formData={formData}
            setFormData={setFormData}
            pickers={pickers}
            photos={photos}
            profile={profile}
            setPhotos={setPhotos}
            setPicsChanged={setPicsChanged}
            imageHandler={imageHandler}
            isCreate={false}
          />
        )}
      />
      <Button
        onPress={() => {
          createObj();
          void database.handleCatalogSave(
            photos,
            profile,
            isPicsChanged,
            setVisible,
            router,
          );
        }}
      >
        Save Entry
      </Button>
      <Button
        style={buttonStyles.bigDeleteButton}
        onPress={() =>
          database.deleteCatalogEntry(entry.id, setVisible, router)
        }
      >
        Delete Catalog Entry
      </Button>
    </SafeAreaView>
  );
};
export default EditEntry;
