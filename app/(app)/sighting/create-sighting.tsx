import React, { useEffect, useRef, useState } from 'react';

import { useRouter } from 'expo-router';

import { FormScreen } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { CatalogRecord, parseUser } from '@/core/domain';
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

const SightingCreateScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(timeItems);
  const [photos, setPhotos] = useState<string[]>([]);
  const [catalogEntries, setCatalogEntries] = useState<readonly CatalogRecord[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string>();
  const [validationErrors, setValidationErrors] =
    useState<SightingFormErrors>({});
  const [toast, setToast] = useState<{ id: number; message: string }>();
  const [scrollRequest, setScrollRequest] = useState<{
    id: number;
    y: number;
  }>();
  const validationAttempt = useRef(0);
  const sectionOffsets = useRef<Partial<Record<SightingFormSection, number>>>({});
  const requiredFieldOffsets = useRef<
    Partial<
      Record<
        SightingRequiredField,
        { section: SightingFormSection; y: number }
      >
    >
  >({});
  const [formData, setFormData] = useState<SightingFormData>({
    name: '',
    info: '',
    fed: false,
    health: false,
    location: { latitude: 0, longitude: 0 },
    date: new Date(),
  });

  useEffect(() => {
    let active = true;
    const actor = parseUser(user);
    setCatalogLoading(true);
    setCatalogError(undefined);
    void appModules.catalog.list(actor).then((result) => {
      if (!active) return;
      if (result.ok) {
        setCatalogEntries(result.value);
        setCatalogError(result.warnings.map(({ message }) => message).join(' ') || undefined);
      } else {
        setCatalogEntries([]);
        setCatalogError(result.error.message);
      }
      setCatalogLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user.id, user.role]);

  useEffect(() => {
    if (validationAttempt.current === 0) return;
    setValidationErrors(
      validateSightingForm({
        formData,
        timeOfDay: value,
        photos,
        currentDate: new Date(),
      }),
    );
  }, [formData, photos, value]);

  const createSighting = async () => {
    if (busy) return;
    setError(undefined);
    const nextValidationErrors = validateSightingForm({
      formData,
      timeOfDay: value,
      photos,
      currentDate: new Date(),
    });
    const firstError = firstSightingErrorField(nextValidationErrors);
    if (firstError) {
      const id = ++validationAttempt.current;
      setValidationErrors(nextValidationErrors);
      setToast({ id, message: 'Please fill in the missing information.' });
      const fieldOffset = requiredFieldOffsets.current[firstError];
      const section = fieldOffset?.section ?? sightingSectionForField(firstError);
      setScrollRequest({
        id,
        y: (sectionOffsets.current[section] ?? 0) + (fieldOffset?.y ?? 0),
      });
      return;
    }
    setValidationErrors({});
    setBusy(true);
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
      scrollRequest={scrollRequest}
      toast={toast}
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
        catalogEntries={catalogEntries}
        catalogLoading={catalogLoading}
        catalogError={catalogError}
        errors={validationErrors}
        onSectionLayout={(section, y) => {
          sectionOffsets.current[section] = y;
        }}
        onRequiredFieldLayout={(field, section, y) => {
          requiredFieldOffsets.current[field] = { section, y };
        }}
        isCreate
      />
    </FormScreen>
  );
};

export default SightingCreateScreen;
