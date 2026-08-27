import React, { useEffect, useRef, useState } from 'react';

import { useRouter } from 'expo-router';

import { FormScreen } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { parseUser, roleAccessPolicies } from '@/core/domain';
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

const CreateStation = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] =
    useState<StationFormErrors>({});
  const [toast, setToast] = useState<{ id: number; message: string }>();
  const [scrollRequest, setScrollRequest] = useState<{
    id: number;
    y: number;
  }>();
  const validationAttempt = useRef(0);
  const sectionOffsets = useRef<Partial<Record<StationFormSection, number>>>({});
  const requiredFieldOffsets = useRef<
    Partial<
      Record<
        StationRequiredField,
        { section: StationFormSection; y: number }
      >
    >
  >({});
  const [formData, setFormData] = useState<StationFormData>({
    name: '',
    location: { latitude: 0, longitude: 0 },
    lastStocked: new Date(),
    stockingFreq: 7,
    knownCats: '',
  });

  useEffect(() => {
    if (validationAttempt.current === 0) return;
    setValidationErrors(validateStationForm({ formData, photos }));
  }, [formData, photos]);

  const createStation = async () => {
    if (busy) return;
    setError(undefined);
    const nextValidationErrors = validateStationForm({ formData, photos });
    const firstError = firstStationErrorField(nextValidationErrors);
    if (firstError) {
      const id = ++validationAttempt.current;
      setValidationErrors(nextValidationErrors);
      setToast({ id, message: 'Please fill in the missing information.' });
      const fieldOffset = requiredFieldOffsets.current[firstError];
      const section = fieldOffset?.section ?? stationSectionForField(firstError);
      setScrollRequest({
        id,
        y: (sectionOffsets.current[section] ?? 0) + (fieldOffset?.y ?? 0),
      });
      return;
    }
    setValidationErrors({});
    setBusy(true);
    const result = await appModules.stations.create(parseUser(user), { ...formData, photos });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace({ pathname: '/stations/view-station', params: { id: result.value.id } });
  };

  return (
    <FormScreen
      title="Create station"
      eyebrow="Officer operations"
      access={{ policy: roleAccessPolicies.manageStations, role: user.role }}
      saveLabel="Create Station"
      savingLabel="Creating station…"
      busy={busy}
      error={error}
      scrollRequest={scrollRequest}
      toast={toast}
      onBack={() => router.back()}
      onSave={() => void createStation()}
    >
      <StationForm
        formData={formData}
        setFormData={setFormData}
        photos={photos}
        setPhotos={setPhotos}
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

export default CreateStation;
