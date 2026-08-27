import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'expo-router';

import { FormScreen } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { parseUser, roleAccessPolicies } from '@/core/domain';
import {
  endOfDay,
  EventForm,
  EventFormData,
  EventFormErrors,
  EventFormSection,
  EventRequiredField,
  firstEventErrorField,
  validateEventForm,
} from '@/forms/EventForm';
import { useAuth } from '@/providers';

const initialEventDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
};

const CreateEvent = () => {
  const router = useRouter();
  const actor = parseUser(useAuth().user);
  const [eventDate] = useState(initialEventDate);
  const [formData, setFormData] = useState<EventFormData>(() => ({
    title: '',
    details: '',
    location: '',
    startsAt: eventDate,
    expiresAt: endOfDay(eventDate),
  }));
  const [photo, setPhoto] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [validationErrors, setValidationErrors] = useState<EventFormErrors>({});
  const [toast, setToast] = useState<{ id: number; message: string }>();
  const [scrollRequest, setScrollRequest] = useState<{
    id: number;
    y: number;
  }>();
  const validationAttempt = useRef(0);
  const sectionOffsets = useRef<Partial<Record<EventFormSection, number>>>({});
  const fieldOffsets = useRef<
    Partial<
      Record<EventRequiredField, { section: EventFormSection; y: number }>
    >
  >({});

  useEffect(() => {
    if (validationAttempt.current === 0) return;
    setValidationErrors(validateEventForm(formData, photo));
  }, [formData, photo]);

  const create = async () => {
    if (busy) return;
    setError(undefined);
    const nextErrors = validateEventForm(formData, photo);
    const firstError = firstEventErrorField(nextErrors);
    if (firstError) {
      const id = ++validationAttempt.current;
      setValidationErrors(nextErrors);
      setToast({ id, message: 'Please fill in the missing information.' });
      const fieldOffset = fieldOffsets.current[firstError];
      const section = fieldOffset?.section ?? 'details';
      setScrollRequest({
        id,
        y: (sectionOffsets.current[section] ?? 0) + (fieldOffset?.y ?? 0),
      });
      return;
    }
    setValidationErrors({});
    setBusy(true);
    const result = await appModules.events.create(actor, {
      ...formData,
      imageLocalUri: photo ?? '',
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace({
      pathname: '/events/view-event' as never,
      params: { id: result.value.id },
    });
  };

  return (
    <FormScreen
      title="Create event"
      eyebrow="Community event"
      access={{ policy: roleAccessPolicies.manageEvents, role: actor.role }}
      saveLabel="Create Event"
      savingLabel="Creating event…"
      busy={busy}
      error={error}
      scrollRequest={scrollRequest}
      toast={toast}
      onBack={() => router.back()}
      onSave={() => void create()}
    >
      <EventForm
        formData={formData}
        setFormData={setFormData}
        photo={photo}
        setPhoto={setPhoto}
        errors={validationErrors}
        onSectionLayout={(section, y) => {
          sectionOffsets.current[section] = y;
        }}
        onRequiredFieldLayout={(field, section, y) => {
          fieldOffsets.current[field] = { section, y };
        }}
      />
    </FormScreen>
  );
};

export default CreateEvent;
