import React from 'react';
import { View } from 'react-native';

import { FormSection } from '../components/design';
import { DateField, FormTextInput, PhotoField } from '../components/forms';

export interface EventFormData {
  readonly title: string;
  readonly details: string;
  readonly location: string;
  readonly startsAt: Date;
  readonly expiresAt: Date;
}

export type EventRequiredField = 'photo' | 'title' | 'details' | 'location';
export type EventFormSection = 'picture' | 'details';
export type EventFormErrors = Partial<Record<EventRequiredField, string>>;

const requiredFieldOrder: readonly EventRequiredField[] = [
  'photo',
  'title',
  'details',
  'location',
];

export const validateEventForm = (
  formData: EventFormData,
  photo?: string,
): EventFormErrors => {
  const errors: EventFormErrors = {};
  if (!photo?.trim()) errors.photo = 'An event picture is required.';
  if (!formData.title.trim()) errors.title = 'Event title is required.';
  if (!formData.details.trim()) errors.details = 'Event details are required.';
  if (!formData.location.trim())
    errors.location = 'Event location is required.';
  return errors;
};

export const firstEventErrorField = (
  errors: EventFormErrors,
): EventRequiredField | undefined =>
  requiredFieldOrder.find((field) => errors[field]);

export const EventForm = ({
  formData,
  setFormData,
  photo,
  setPhoto,
  errors = {},
  onSectionLayout,
  onRequiredFieldLayout,
}: {
  readonly formData: EventFormData;
  readonly setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
  readonly photo?: string;
  readonly setPhoto: React.Dispatch<React.SetStateAction<string | undefined>>;
  readonly errors?: EventFormErrors;
  readonly onSectionLayout?: (section: EventFormSection, y: number) => void;
  readonly onRequiredFieldLayout?: (
    field: EventRequiredField,
    section: EventFormSection,
    y: number,
  ) => void;
}) => {
  const change = <Key extends keyof EventFormData>(
    field: Key,
    value: EventFormData[Key],
  ) => setFormData((current) => ({ ...current, [field]: value }));

  return (
    <>
      <FormSection
        title="Event picture"
        testID="event-section-picture"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('picture', nativeEvent.layout.y)
        }
      >
        <View
          testID="event-field-photo"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('photo', 'picture', nativeEvent.layout.y)
          }
        >
          <PhotoField
            photos={photo ? [photo] : []}
            required
            validationError={errors.photo}
            coverUri={photo}
            onAddPhoto={setPhoto}
            onRemovePhoto={() => setPhoto(undefined)}
          />
        </View>
      </FormSection>
      <FormSection
        title="Event details"
        testID="event-section-details"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('details', nativeEvent.layout.y)
        }
      >
        <View
          testID="event-field-title"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('title', 'details', nativeEvent.layout.y)
          }
        >
          <FormTextInput
            label="Title"
            required
            error={errors.title}
            value={formData.title}
            maxLength={120}
            placeholder="Event title"
            onChangeText={(value) => change('title', value)}
          />
        </View>
        <View
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('details', 'details', nativeEvent.layout.y)
          }
        >
          <FormTextInput
            label="Details"
            required
            error={errors.details}
            value={formData.details}
            maxLength={5000}
            multiline
            placeholder="What should members know?"
            onChangeText={(value) => change('details', value)}
          />
        </View>
        <View
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('location', 'details', nativeEvent.layout.y)
          }
        >
          <FormTextInput
            label="Location"
            required
            error={errors.location}
            value={formData.location}
            maxLength={300}
            placeholder="Building, room, or meeting point"
            onChangeText={(value) => change('location', value)}
          />
        </View>
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
