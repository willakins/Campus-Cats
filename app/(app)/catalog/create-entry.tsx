import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'expo-router';

import { FormScreen } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { CatalogTag, Cat, CatStatus, Fur, parseUser, roleAccessPolicies, Sex, TNRStatus } from '@/core/domain';
import { defaultCatalogTagIdsForCat } from '@/features/catalog/catalogDiscovery';
import {
  catalogSectionForField,
  CatalogForm,
  CatalogFormData,
  CatalogFormErrors,
  CatalogFormSection,
  CatalogRequiredField,
  firstCatalogErrorField,
  validateCatalogForm,
} from '@/forms/CatalogForm';
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
  const [validationErrors, setValidationErrors] =
    useState<CatalogFormErrors>({});
  const [toast, setToast] = useState<{ id: number; message: string }>();
  const [scrollRequest, setScrollRequest] = useState<{
    id: number;
    y: number;
  }>();
  const validationAttempt = useRef(0);
  const sectionOffsets = useRef<Partial<Record<CatalogFormSection, number>>>({});
  const requiredFieldOffsets = useRef<
    Partial<
      Record<
        CatalogRequiredField,
        { section: CatalogFormSection; y: number }
      >
    >
  >({});
  const [availableTags, setAvailableTags] = useState<readonly CatalogTag[]>([]);
  const [tagsReady, setTagsReady] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<readonly string[]>();
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
  const resolvedTagIds = (
    selectedTagIds ?? defaultCatalogTagIdsForCat(cat())
  ).filter((id) => availableTags.some((tag) => tag.id === id));

  useEffect(() => {
    let active = true;
    void appModules.catalogTags.list(parseUser(user)).then((result) => {
      if (!active) return;
      if (result.ok) {
        setAvailableTags(result.value);
        setTagsReady(true);
      } else setError(result.error.message);
    });
    return () => {
      active = false;
    };
  }, [user.id, user.role]);

  useEffect(() => {
    if (validationAttempt.current === 0) return;
    setValidationErrors(validateCatalogForm({ formData, photos }));
  }, [formData, photos]);

  const createEntry = async () => {
    if (busy) return;
    setError(undefined);
    const nextValidationErrors = validateCatalogForm({ formData, photos });
    const firstError = firstCatalogErrorField(nextValidationErrors);
    if (firstError) {
      const id = ++validationAttempt.current;
      setValidationErrors(nextValidationErrors);
      setToast({ id, message: 'Please fill in the missing information.' });
      const fieldOffset = requiredFieldOffsets.current[firstError];
      const section = fieldOffset?.section ?? catalogSectionForField(firstError);
      setScrollRequest({
        id,
        y: (sectionOffsets.current[section] ?? 0) + (fieldOffset?.y ?? 0),
      });
      return;
    }
    setValidationErrors({});
    if (!tagsReady) {
      setError('Catalog tags are still loading. Please try again.');
      return;
    }
    setBusy(true);
    const result = await appModules.catalog.create(parseUser(user), {
      cat: cat(),
      credits: formData.credits,
      photos,
      tagIds: resolvedTagIds,
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
      access={{ policy: roleAccessPolicies.manageCatalog, role: user.role }}
      saveLabel="Create Entry"
      savingLabel="Creating entry…"
      busy={busy}
      error={error}
      scrollRequest={scrollRequest}
      toast={toast}
      onBack={() => router.back()}
      onSave={() => void createEntry()}
    >
      <CatalogForm
        formData={formData}
        setFormData={setFormData}
        pickers={pickers}
        photos={photos}
        setPhotos={setPhotos}
        availableTags={availableTags}
        selectedTagIds={resolvedTagIds}
        onSelectedTagIdsChange={setSelectedTagIds}
        errors={validationErrors}
        onSectionLayout={(section, y) => {
          sectionOffsets.current[section] = y;
        }}
        onRequiredFieldLayout={(field, section, y) => {
          requiredFieldOffsets.current[field] = { section, y };
        }}
      />
    </FormScreen>
  );
};

export default CreateEntry;
