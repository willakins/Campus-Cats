import React, { Dispatch } from 'react';
import { View } from 'react-native';

import { CatalogCatField, DateField, FormTextInput, LocationField, PhotoField, SelectField, ToggleField } from '@/components/forms';
import { FormSection } from '@/components/design';
import { CatalogRecord, Coordinates, sightingDateError } from '@/core/domain';
import { PickerConfig } from '@/types';

export interface SightingFormData {
  readonly name: string;
  readonly info: string;
  readonly fed: boolean;
  readonly health: boolean;
  readonly location: Coordinates;
  readonly date: Date;
}

export type SightingRequiredField =
  | 'name'
  | 'date'
  | 'timeOfDay'
  | 'location'
  | 'photos';
export type SightingFormSection = 'basics' | 'location' | 'photos';
export type SightingFormErrors = Partial<
  Record<SightingRequiredField, string>
>;

const requiredFieldOrder: readonly SightingRequiredField[] = [
  'name',
  'date',
  'timeOfDay',
  'location',
  'photos',
];

export const validateSightingForm = ({
  formData,
  timeOfDay,
  photos,
  currentDate,
}: {
  formData: SightingFormData;
  timeOfDay: string;
  photos: readonly string[];
  currentDate: Date;
}): SightingFormErrors => {
  const errors: SightingFormErrors = {};
  if (!formData.name.trim()) errors.name = 'Cat name is required.';
  const dateError = sightingDateError(formData.date, currentDate);
  if (dateError) errors.date = dateError;
  if (!timeOfDay.trim()) {
    errors.timeOfDay = 'Time of sighting is required.';
  }
  if (
    !Number.isFinite(formData.location.latitude) ||
    !Number.isFinite(formData.location.longitude) ||
    formData.location.latitude === 0 ||
    formData.location.longitude === 0
  ) {
    errors.location = 'Sighting location is required.';
  }
  if (photos.length === 0) errors.photos = 'At least one photo is required.';
  return errors;
};

export const firstSightingErrorField = (
  errors: SightingFormErrors,
): SightingRequiredField | undefined =>
  requiredFieldOrder.find((field) => errors[field]);

export const sightingSectionForField = (
  field: SightingRequiredField,
): SightingFormSection => {
  if (field === 'location') return 'location';
  if (field === 'photos') return 'photos';
  return 'basics';
};

interface SightingFormProps {
  formData: SightingFormData;
  setFormData: React.Dispatch<React.SetStateAction<SightingFormData>>;
  value: string;
  setValue: Dispatch<React.SetStateAction<string>>;
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  items: { label: string; value: string }[];
  setItems: Dispatch<React.SetStateAction<{ label: string; value: string }[]>>;
  photos: string[];
  profile?: string;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  isCreate: boolean;
  onPromotePhoto?: (uri: string) => void;
  onDeletePhoto?: (uri: string) => void;
  catalogEntries?: readonly CatalogRecord[];
  catalogLoading?: boolean;
  catalogError?: string;
  errors?: SightingFormErrors;
  onSectionLayout?: (section: SightingFormSection, y: number) => void;
  onRequiredFieldLayout?: (
    field: SightingRequiredField,
    section: SightingFormSection,
    y: number,
  ) => void;
}

const SightingForm: React.FC<SightingFormProps> = ({
  formData,
  setFormData,
  value,
  setValue,
  open,
  setOpen,
  items,
  setItems,
  photos,
  profile,
  setPhotos,
  onPromotePhoto,
  onDeletePhoto,
  isCreate,
  catalogEntries = [],
  catalogLoading = false,
  catalogError,
  errors = {},
  onSectionLayout,
  onRequiredFieldLayout,
}) => {
  const handleChange = <Key extends keyof SightingFormData>(
    field: Key,
    value: SightingFormData[Key],
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };
  const displayedPhotos = profile ? [profile, ...photos] : photos;
  const promote = onPromotePhoto ?? ((uri: string) =>
    setPhotos((current) => [uri, ...current.filter((photo) => photo !== uri)]));
  const remove = onDeletePhoto ?? ((uri: string) =>
    setPhotos((current) => current.filter((photo) => photo !== uri)));
  const timePicker: PickerConfig<string> = {
    value,
    setValue: (nextValue) => {
      setValue(nextValue);
    },
    open,
    setOpen,
    items,
    setItems,
  };
  const currentDate = new Date();
  const dateError = sightingDateError(formData.date, currentDate);

  return (
    <>
      <FormSection
        title="Basics"
        testID="sighting-section-basics"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('basics', nativeEvent.layout.y)
        }
      >
        <View
          testID="sighting-field-name"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('name', 'basics', nativeEvent.layout.y)
          }
        >
          {isCreate ? (
            <CatalogCatField
              value={formData.name}
              entries={catalogEntries}
              loading={catalogLoading}
              error={catalogError}
              validationError={errors.name}
              onChange={(name) => handleChange('name', name)}
            />
          ) : (
            <FormTextInput
              label="Cat name"
              required
              error={errors.name}
              value={formData.name}
              placeholder="Name, if known"
              onChangeText={(text) => handleChange('name', text)}
            />
          )}
        </View>
        <View
          testID="sighting-field-date"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('date', 'basics', nativeEvent.layout.y)
          }
        >
          <DateField
            label="Day of sighting"
            date={formData.date}
            maximumDate={currentDate}
            error={errors.date ?? dateError}
            onChange={(date) => handleChange('date', date)}
          />
        </View>
        <View
          testID="sighting-field-timeOfDay"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('timeOfDay', 'basics', nativeEvent.layout.y)
          }
        >
          <SelectField
            label="Time of sighting"
            required
            error={errors.timeOfDay}
            picker={timePicker}
            placeholder="Select a time of day"
          />
        </View>
      </FormSection>
      <FormSection
        title="Location"
        testID="sighting-section-location"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('location', nativeEvent.layout.y)
        }
      >
        <View
          testID="sighting-field-location"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('location', 'location', nativeEvent.layout.y)
          }
        >
          <LocationField
            label="Sighting location"
            value={formData.location}
            error={errors.location}
            onChange={(location) => handleChange('location', location)}
          />
        </View>
      </FormSection>
      <FormSection title="Status">
        <ToggleField
          label="Cat was fed"
          value={formData.fed}
          onValueChange={(fed) => handleChange('fed', fed)}
        />
        <ToggleField
          label="Cat appeared healthy"
          value={formData.health}
          onValueChange={(health) => handleChange('health', health)}
        />
      </FormSection>
      <FormSection
        title="Photos *"
        testID="sighting-section-photos"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('photos', nativeEvent.layout.y)
        }
      >
        <View
          testID="sighting-field-photos"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('photos', 'photos', nativeEvent.layout.y)
          }
        >
          <PhotoField
            hideLabel
            required
            validationError={errors.photos}
            photos={displayedPhotos}
            coverUri={profile || photos[0]}
            onAddPhoto={(uri) => {
              setPhotos((current) => [...current, uri]);
            }}
            onPromotePhoto={promote}
            onRemovePhoto={remove}
          />
        </View>
      </FormSection>
      <FormSection title="Notes">
        <FormTextInput
          label="Additional notes"
          hideLabel
          value={formData.info}
          placeholder="What was the cat doing?"
          multiline
          onChangeText={(text) => handleChange('info', text)}
        />
      </FormSection>
    </>
  );
};

export { SightingForm };
