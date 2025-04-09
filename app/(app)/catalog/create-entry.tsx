import { useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, CatalogForm, SnackbarMessage } from '@/components';
import DatabaseService from '@/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { Cat, CatalogEntry, Sex, TNRStatus, CatStatus } from '@/types/CatalogEntry';
import { useAuth } from '@/providers/AuthProvider';
import { setSelectedCatalogEntry } from '@/stores/CatalogEntryStores';

const create_entry = () =>{
  const router = useRouter();
  const { user } = useAuth();
  const database = DatabaseService.getInstance();
  const [visible, setVisible] = useState<boolean>(false);

  // ---------- Status Picker ----------
  const [statusValue, setStatusValue] = useState<string>('');
  const [statusOpen, setStatusOpen] = useState<boolean>(false);
  const [statusItems, setStatusItems] = useState([
    { label: 'Healthy', value: 'Healthy' },
    { label: 'Injured', value: 'Injured' },
    { label: 'Missing', value: 'Missing' },
  ]);

  const statusPicker = {
    value: statusValue,
    setValue: setStatusValue,
    open: statusOpen,
    setOpen: setStatusOpen,
    items: statusItems,
    setItems: setStatusItems,
  };

  // ---------- TNR Picker ----------
  const [tnrValue, setTnrValue] = useState<string>('');
  const [tnrOpen, setTnrOpen] = useState<boolean>(false);
  const [tnrItems, setTnrItems] = useState([
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' },
    { label: 'Unknown', value: 'Unknown' },
  ]);

  const tnrPicker = {
    value: tnrValue,
    setValue: setTnrValue,
    open: tnrOpen,
    setOpen: setTnrOpen,
    items: tnrItems,
    setItems: setTnrItems,
  };

  // ---------- Sex Picker ----------
  const [sexValue, setSexValue] = useState<string>('');
  const [sexOpen, setSexOpen] = useState<boolean>(false);
  const [sexItems, setSexItems] = useState([
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Unknown', value: 'Unknown' },
  ]);

  const sexPicker = {
    value: sexValue,
    setValue: setSexValue,
    open: sexOpen,
    setOpen: setSexOpen,
    items: sexItems,
    setItems: setSexItems,
  };

  // ---------- Fur Picker ----------
  const [furValue, setFurValue] = useState<string>('');
  const [furOpen, setFurOpen] = useState<boolean>(false);
  const [furItems, setFurItems] = useState([
    { label: 'Short', value: 'Short' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Long', value: 'Long' },
    { label: 'Unknown', value: 'Unknown' },
  ]);

  const furPicker = {
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

  const [photos, setPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState<{
    name: string;
    descShort: string;
    descLong: string;
    colorPattern: string;
    behavior: string;
    yearsRecorded: string;
    AoR: string;
    currentStatus: CatStatus;
    furLength: string;
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
    furLength: "",
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
      currentStatus: formData.currentStatus,
      furLength: formData.furLength,
      furPattern: formData.furPattern,
      tnr: formData.tnr,
      sex: formData.sex,
    }
    return newCat;
  }
  const createObj = () => {
    const newEntry = new CatalogEntry({
      id:"-1",
      cat:createCat(),
      credits:formData.credits,
      createdAt: new Date(),
      createdBy:user,
    })
    setSelectedCatalogEntry(newEntry);
  };
  
  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage text="Creating Report..." visible={visible} setVisible={setVisible} />
      <Text style={textStyles.title}>Create Entry</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <CatalogForm
          formData={formData}
          setFormData={setFormData}
          pickers={pickers}
          photos={photos}
          setPhotos={setPhotos}
          isCreate={true}
        />
      </ScrollView>
      <Button style={buttonStyles.bigButton} onPress={() => {
        createObj();
        database.handleCatalogCreate(photos, setVisible, router);
      }}>
        <Text style={textStyles.bigButtonText}> Create Entry</Text>
      </Button>
    </SafeAreaView>
  );
}
export default create_entry;