import React from 'react';

import { FormSection } from '../components/design';
import { DateField, FormTextInput, PhotoField } from '../components/forms';

export interface EventFormData {
  readonly title: string;
  readonly details: string;
  readonly location: string;
  readonly startsAt: Date;
  readonly expiresAt: Date;
}

export const EventForm = ({
  formData,
  setFormData,
  photo,
  setPhoto,
}: {
  readonly formData: EventFormData;
  readonly setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
  readonly photo?: string;
  readonly setPhoto: React.Dispatch<React.SetStateAction<string | undefined>>;
}) => {
  const change = <Key extends keyof EventFormData>(
    field: Key,
    value: EventFormData[Key],
  ) => setFormData((current) => ({ ...current, [field]: value }));

  return (
    <>
      <FormSection title="Event picture">
        <PhotoField
          photos={photo ? [photo] : []}
          coverUri={photo}
          onAddPhoto={setPhoto}
          onRemovePhoto={() => setPhoto(undefined)}
        />
      </FormSection>
      <FormSection title="Event details">
        <FormTextInput
          label="Title"
          required
          value={formData.title}
          maxLength={120}
          placeholder="Event title"
          onChangeText={(value) => change('title', value)}
        />
        <FormTextInput
          label="Details"
          required
          value={formData.details}
          maxLength={5000}
          multiline
          placeholder="What should members know?"
          onChangeText={(value) => change('details', value)}
        />
        <FormTextInput
          label="Location"
          required
          value={formData.location}
          maxLength={300}
          placeholder="Building, room, or meeting point"
          onChangeText={(value) => change('location', value)}
        />
      </FormSection>
      <FormSection title="Dates">
        <DateField
          label="Event date"
          date={formData.startsAt}
          onChange={(value) => change('startsAt', value)}
        />
        <DateField
          label="Expires after"
          date={formData.expiresAt}
          onChange={(value) => change('expiresAt', endOfDay(value))}
        />
      </FormSection>
    </>
  );
};

export const endOfDay = (value: Date): Date => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};
