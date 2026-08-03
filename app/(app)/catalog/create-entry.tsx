import { Dispatch, useState } from 'react';
import { Alert, FlatList, SafeAreaView, Text } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, SnackbarMessage } from '@/components';
import { appModules } from '@/composition/appModules';
import { Cat, CatStatus, Fur, Sex, TNRStatus, parseUser } from '@/core/domain';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { PickerConfig } from '@/types';
import { useAuth } from '@/providers/AuthProvider';
import { CatalogForm } from '@/forms';

const create_entry = () =>{
  const router = useRouter();
  const { user } = useAuth();
  const [visible, setVisible] = useState<boolean>(false);
  const [photos, setPhotos] = useState<string[]>([]);

  // ---------- Status Picker ----------
  const [statusValue, setStatusValue] = useState<CatStatus>('Unknown');
  const [statusOpen, setStatusOpen] = useState<boolean>(false);
  const [statusItems, setStatusItems] = useState([
    { label: 'Adopted', value: 'Adopted' },
    { label: 'Deceased', value: 'Deceased' },
    { label: 'Feral', value: 'Feral' },
    { label: 'Frat Cat', value: 'Frat Cat' },
    { label: 'Unknown', value: 'Unknown' },
  ]);

  const statusPicker:PickerConfig<CatStatus> = {
    value: statusValue,
    setValue: setStatusValue,
    open: statusOpen,
    setOpen: setStatusOpen,
    items: statusItems,
    setItems: setStatusItems,
  };

  // ---------- TNR Picker ----------
  const [tnrValue, setTnrValue] = useState<TNRStatus>('Unknown');
  const [tnrOpen, setTnrOpen] = useState<boolean>(false);
  const [tnrItems, setTnrItems] = useState([
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
    { label: 'Unknown', value: 'Unknown' },
  ]);

  const tnrPicker:PickerConfig<TNRStatus> = {
    value: tnrValue,
    setValue: setTnrValue,
    open: tnrOpen,
    setOpen: setTnrOpen,
    items: tnrItems,
    setItems: setTnrItems,
  };

  // ---------- Sex Picker ----------
  const [sexValue, setSexValue] = useState<Sex>('Unknown');
  const [sexOpen, setSexOpen] = useState<boolean>(false);
  const [sexItems, setSexItems] = useState([
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Unknown', value: 'Unknown' },
  ]);

  const sexPicker:PickerConfig<Sex> = {
    value: sexValue,
    setValue: setSexValue,
    open: sexOpen,
    setOpen: setSexOpen,
    items: sexItems,
    setItems: setSexItems,
  };

  // ---------- Fur Picker ----------
  const [furValue, setFurValue] = useState<Fur>('Unknown');
  const [furOpen, setFurOpen] = useState<boolean>(false);
  const [furItems, setFurItems] = useState([
    { label: 'Short', value: 'Short' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Long', value: 'Long' },
    { label: 'Unknown', value: 'Unknown' },
  ]);

  const furPicker:PickerConfig<Fur> = {
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
    name: "",
    descShort: "",
    descLong: "",
    colorPattern: "",
    behavior: "",
    yearsRecorded: "",
    AoR: "",
    currentStatus: "Unknown",
    furLength: "Unknown",
    furPattern: "",
    tnr: "Unknown",
    sex: "Unknown",
    credits: "",
  });

  const createCat = () => {
    const newCat:Cat = {
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
    }
    return newCat;
  }
  const createEntry = async () => {
    setVisible(true);
    const result = await appModules.catalog.create(parseUser(user), {
      cat: createCat(),
      credits: formData.credits,
      photos,
    });
    setVisible(false);
    if (!result.ok) {
      Alert.alert('Could not create entry', result.error.message);
      return;
    }
    router.replace({
      pathname: '/catalog/view-entry',
      params: { id: result.value.id },
    });
  };
  
  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage text="Creating Entry..." visible={visible} setVisible={setVisible} />
      <Text style={textStyles.pageTitle}>Create Entry</Text>
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
          setPhotos={setPhotos}
          isCreate={true}
        />
              )}/>
      <Button style={buttonStyles.bigButton} onPress={() => void createEntry()}>
        <Text style={textStyles.bigButtonText}> Create Entry</Text>
      </Button>
    </SafeAreaView>
  );
}
export default create_entry;
