import React from 'react';
import { View } from 'react-native';

import { FormSection } from '@/components/design';
import { DateField, FormTextInput, LocationField, PhotoField } from '@/components/forms';
import { Coordinates } from '@/core/domain';

export interface StationFormData {
  readonly name: string;
  readonly location: Coordinates;
  readonly lastStocked: Date;
  readonly stockingFreq: number;
  readonly knownCats: string;
}

export type StationRequiredField =
  | 'name'
  | 'location'
  | 'lastStocked'
  | 'stockingFreq'
  | 'photos';
export type StationFormSection =
  | 'basics'
  | 'location'
  | 'status'
  | 'photos';
export type StationFormErrors = Partial<
  Record<StationRequiredField, string>
>;

const requiredFieldOrder: readonly StationRequiredField[] = [
  'name',
  'location',
  'lastStocked',
  'stockingFreq',
  'photos',
];

export const validateStationForm = ({
  formData,
  photos,
}: {
  formData: StationFormData;
  photos: readonly string[];
}): StationFormErrors => {
  const errors: StationFormErrors = {};
  if (!formData.name.trim()) errors.name = 'Station name is required.';
  if (
    !Number.isFinite(formData.location.latitude) ||
    !Number.isFinite(formData.location.longitude) ||
    formData.location.latitude === 0 ||
    formData.location.longitude === 0
  ) {
    errors.location = 'Station location is required.';
  }
  if (Number.isNaN(formData.lastStocked.getTime())) {
    errors.lastStocked = 'Last stocked date is required.';
  }
  if (formData.stockingFreq === 0) {
    errors.stockingFreq = 'Restocking frequency is required.';
  } else if (
    !Number.isFinite(formData.stockingFreq) ||
    formData.stockingFreq < 0
  ) {
    errors.stockingFreq = 'Restocking frequency must be a positive number.';
  }
  if (photos.length === 0) errors.photos = 'At least one photo is required.';
  return errors;
};

export const firstStationErrorField = (
  errors: StationFormErrors,
): StationRequiredField | undefined =>
  requiredFieldOrder.find((field) => errors[field]);

export const stationSectionForField = (
  field: StationRequiredField,
): StationFormSection => {
  if (field === 'location') return 'location';
  if (field === 'lastStocked' || field === 'stockingFreq') return 'status';
  if (field === 'photos') return 'photos';
  return 'basics';
};

interface StationFormProps {
  formData: StationFormData;
  setFormData: React.Dispatch<React.SetStateAction<StationFormData>>;
  photos: string[];
  profile?: string;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  onPromotePhoto?: (uri: string) => void;
  onDeletePhoto?: (uri: string) => void;
  errors?: StationFormErrors;
  onSectionLayout?: (section: StationFormSection, y: number) => void;
  onRequiredFieldLayout?: (
    field: StationRequiredField,
    section: StationFormSection,
    y: number,
  ) => void;
}

const StationForm: React.FC<StationFormProps> = ({
  formData,
  setFormData,
  photos,
  profile,
  setPhotos,
  onPromotePhoto,
  onDeletePhoto,
  errors = {},
  onSectionLayout,
  onRequiredFieldLayout,
}) => {
  const handleChange = <Key extends keyof StationFormData>(field: Key, value: StationFormData[Key]) =>
    setFormData((current) => ({ ...current, [field]: value }));
  const displayedPhotos = profile ? [profile, ...photos] : photos;
  const promote = onPromotePhoto ?? ((uri: string) =>
    setPhotos((current) => [uri, ...current.filter((photo) => photo !== uri)]));
  const remove = onDeletePhoto ?? ((uri: string) =>
    setPhotos((current) => current.filter((photo) => photo !== uri)));

  return (
    <>
      <FormSection
        title="Basics"
        testID="station-section-basics"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('basics', nativeEvent.layout.y)
        }
      >
        <View
          testID="station-field-name"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('name', 'basics', nativeEvent.layout.y)
          }
        >
          <FormTextInput
            label="Station name"
            required
            error={errors.name}
            value={formData.name}
            placeholder="What should this station be called?"
            onChangeText={(text) => handleChange('name', text)}
          />
        </View>
      </FormSection>
      <FormSection
        title="Location"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('location', nativeEvent.layout.y)
        }
      >
        <View
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('location', 'location', nativeEvent.layout.y)
          }
        >
          <LocationField
            label="Station location"
            value={formData.location}
            error={errors.location}
            onChange={(location) => handleChange('location', location)}
          />
        </View>
      </FormSection>
      <FormSection
        title="Status"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('status', nativeEvent.layout.y)
        }
      >
        <View
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('lastStocked', 'status', nativeEvent.layout.y)
          }
        >
          <DateField
            label="Last stocked"
            date={formData.lastStocked}
            error={errors.lastStocked}
            onChange={(date) => handleChange('lastStocked', date)}
          />
        </View>
        <View
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('stockingFreq', 'status', nativeEvent.layout.y)
          }
        >
          <FormTextInput
            label="Restocking frequency in days"
            required
            error={errors.stockingFreq}
            value={formData.stockingFreq === 0 ? '' : String(formData.stockingFreq)}
            placeholder="7"
            inputMode="numeric"
            keyboardType="number-pad"
            onChangeText={(text) => handleChange('stockingFreq', Number(text))}
          />
        </View>
      </FormSection>
      <FormSection
        title="Photos *"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('photos', nativeEvent.layout.y)
        }
      >
        <View
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
            onAddPhoto={(uri) => setPhotos((current) => [...current, uri])}
            onPromotePhoto={promote}
            onRemovePhoto={remove}
          />
        </View>
      </FormSection>
      <FormSection title="Notes">
        <FormTextInput
          label="Known cats"
          helper="Optional—list cats that frequent this station."
          value={formData.knownCats}
          placeholder="Common cats seen here"
          multiline
          onChangeText={(text) => handleChange('knownCats', text)}
        />
      </FormSection>
    </>
  );
};

export { StationForm };
