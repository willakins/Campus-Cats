import { useState } from 'react';

import { useRouter } from 'expo-router';

import { FormScreen } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { parseUser } from '@/core/domain';
import { endOfDay, EventForm, EventFormData } from '@/forms/EventForm';
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

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
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
      saveLabel="Create Event"
      savingLabel="Creating event…"
      busy={busy}
      error={error}
      onBack={() => router.back()}
      onSave={() => void create()}
    >
      <EventForm
        formData={formData}
        setFormData={setFormData}
        photo={photo}
        setPhoto={setPhoto}
      />
    </FormScreen>
  );
};

export default CreateEvent;
