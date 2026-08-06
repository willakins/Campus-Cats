import React, { Dispatch } from 'react';

import { DateField, FormTextInput, LocationField, PhotoField, SelectField, ToggleField } from '@/components/forms';
import { FormSection } from '@/components/design';
import { Coordinates } from '@/core/domain';
import { PickerConfig } from '@/types';

export interface SightingFormData {
  readonly name: string;
  readonly info: string;
  readonly fed: boolean;
  readonly health: boolean;
  readonly location: Coordinates;
  readonly date: Date;
}

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
}) => {
  const handleChange = <Key extends keyof SightingFormData>(
    field: Key,
    value: SightingFormData[Key],
  ) => setFormData((current) => ({ ...current, [field]: value }));
  const displayedPhotos = profile ? [profile, ...photos] : photos;
  const promote = onPromotePhoto ?? ((uri: string) =>
    setPhotos((current) => [uri, ...current.filter((photo) => photo !== uri)]));
  const remove = onDeletePhoto ?? ((uri: string) =>
    setPhotos((current) => current.filter((photo) => photo !== uri)));
  const timePicker: PickerConfig<string> = {
    value,
    setValue,
    open,
    setOpen,
    items,
    setItems,
  };

  return (
    <>
      <FormSection title="Basics">
        <FormTextInput
          label="Cat name"
          required
          value={formData.name}
          placeholder="Name, if known"
          onChangeText={(text) => handleChange('name', text)}
        />
        <DateField label="Day of sighting" date={formData.date} onChange={(date) => handleChange('date', date)} />
        <SelectField
          label="Time of sighting"
          required
          picker={timePicker}
          placeholder="Select a time of day"
          zIndex={3000}
        />
      </FormSection>
      <FormSection title="Location">
        <LocationField
          label="Sighting location"
          value={formData.location}
          onChange={(location) => handleChange('location', location)}
        />
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
          label="Additional notes"
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
