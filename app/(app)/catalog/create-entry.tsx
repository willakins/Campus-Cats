import { useState } from 'react';

import { useRouter } from 'expo-router';

import { FormScreen } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { Cat, CatStatus, Fur, parseUser, Sex, TNRStatus } from '@/core/domain';
import { CatalogForm, CatalogFormData } from '@/forms/CatalogForm';
import { useAuth } from '@/providers/AuthProvider';
import { PickerConfig } from '@/types';

const statusItems = ['Adopted', 'Deceased', 'Feral', 'Frat Cat', 'Unknown'].map((value) => ({ label: value, value }));
const tnrItems = ['Yes', 'No', 'Unknown'].map((value) => ({ label: value, value }));
const sexItems = ['Male', 'Female', 'Unknown'].map((value) => ({ label: value, value }));
const furItems = ['Short', 'Medium', 'Long', 'Unknown'].map((value) => ({ label: value, value }));

const CreateEntry = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [photos, setPhotos] = useState<string[]>([]);
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
    statusPicker: { value: statusValue, setValue: setStatusValue, open: statusOpen, setOpen: setStatusOpen, items: statusOptions, setItems: setStatusOptions } as PickerConfig<CatStatus>,
    tnrPicker: { value: tnrValue, setValue: setTnrValue, open: tnrOpen, setOpen: setTnrOpen, items: tnrOptions, setItems: setTnrOptions } as PickerConfig<TNRStatus>,
    sexPicker: { value: sexValue, setValue: setSexValue, open: sexOpen, setOpen: setSexOpen, items: sexOptions, setItems: setSexOptions } as PickerConfig<Sex>,
    furPicker: { value: furValue, setValue: setFurValue, open: furOpen, setOpen: setFurOpen, items: furOptions, setItems: setFurOptions } as PickerConfig<Fur>,
  };
  const cat = (): Cat => ({
    ...formData,
    currentStatus: statusValue,
    furLength: furValue,
    tnr: tnrValue,
    sex: sexValue,
  });
  const createEntry = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result = await appModules.catalog.create(parseUser(user), {
      cat: cat(),
      credits: formData.credits,
      photos,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace({ pathname: '/catalog/view-entry', params: { id: result.value.id } });
  };

  return (
    <FormScreen
      title="Create catalog entry"
      eyebrow="Campus field guide"
      saveLabel="Create Entry"
      savingLabel="Creating entry…"
      busy={busy}
      error={error}
      onBack={() => router.back()}
      onSave={() => void createEntry()}
    >
      <CatalogForm
        formData={formData}
        setFormData={setFormData}
        pickers={pickers}
        photos={photos}
        setPhotos={setPhotos}
        isCreate
      />
    </FormScreen>
  );
};

export default CreateEntry;
