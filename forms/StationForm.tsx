import React from 'react';

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

interface StationFormProps {
  formData: StationFormData;
  setFormData: React.Dispatch<React.SetStateAction<StationFormData>>;
  photos: string[];
  profile?: string;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  isCreate: boolean;
  onPromotePhoto?: (uri: string) => void;
  onDeletePhoto?: (uri: string) => void;
}

const StationForm: React.FC<StationFormProps> = ({
  formData,
  setFormData,
  photos,
  profile,
  setPhotos,
  onPromotePhoto,
  onDeletePhoto,
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
      <FormSection title="Basics">
        <FormTextInput
          label="Station name"
          required
          value={formData.name}
          placeholder="What should this station be called?"
          onChangeText={(text) => handleChange('name', text)}
        />
      </FormSection>
      <FormSection title="Location">
        <LocationField
          label="Station location"
          value={formData.location}
          onChange={(location) => handleChange('location', location)}
        />
      </FormSection>
      <FormSection title="Status">
        <DateField
          label="Last stocked"
          date={formData.lastStocked}
          onChange={(date) => handleChange('lastStocked', date)}
        />
        <FormTextInput
          label="Restocking frequency in days"
          required
          value={formData.stockingFreq === 0 ? '' : String(formData.stockingFreq)}
          placeholder="7"
          inputMode="numeric"
          keyboardType="number-pad"
          onChangeText={(text) => handleChange('stockingFreq', Number(text))}
        />
      </FormSection>
      <FormSection title="Photos">
        <PhotoField
          photos={displayedPhotos}
          coverUri={profile || photos[0]}
          onAddPhoto={(uri) => setPhotos((current) => [...current, uri])}
          onPromotePhoto={promote}
          onRemovePhoto={remove}
        />
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
