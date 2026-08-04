import React from 'react';

import { FormSection } from '@/components/design';
import { FormTextInput, PhotoField, SelectField } from '@/components/forms';
import { CatStatus, Fur, Sex, TNRStatus } from '@/core/domain';
import { PickerConfig } from '@/types';

export interface CatalogFormData {
  readonly name: string;
  readonly descShort: string;
  readonly descLong: string;
  readonly colorPattern: string;
  readonly behavior: string;
  readonly yearsRecorded: string;
  readonly AoR: string;
  readonly furPattern: string;
  readonly credits: string;
}

interface CatalogFormProps {
  formData: CatalogFormData;
  setFormData: React.Dispatch<React.SetStateAction<CatalogFormData>>;
  pickers: {
    statusPicker: PickerConfig<CatStatus>;
    tnrPicker: PickerConfig<TNRStatus>;
    sexPicker: PickerConfig<Sex>;
    furPicker: PickerConfig<Fur>;
  };
  photos: string[];
  profile?: string;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  isCreate: boolean;
  onPromotePhoto?: (uri: string) => void;
  onDeletePhoto?: (uri: string) => void;
}

const CatalogForm: React.FC<CatalogFormProps> = ({
  formData,
  setFormData,
  pickers,
  photos,
  profile,
  setPhotos,
  onPromotePhoto,
  onDeletePhoto,
}) => {
  const handleChange = (field: keyof CatalogFormData, value: string) =>
    setFormData((current) => ({ ...current, [field]: value }));
  const displayedPhotos = profile ? [profile, ...photos] : photos;
  const promote = onPromotePhoto ?? ((uri: string) =>
    setPhotos((current) => [uri, ...current.filter((photo) => photo !== uri)]));
  const remove = onDeletePhoto ?? ((uri: string) =>
    setPhotos((current) => current.filter((photo) => photo !== uri)));

  return (
    <>
      <FormSection title="Basics">
        <FormTextInput label="Cat name" required value={formData.name} placeholder="Name" onChangeText={(text) => handleChange('name', text)} />
        <FormTextInput label="Short description" required value={formData.descShort} placeholder="A short descriptive phrase" onChangeText={(text) => handleChange('descShort', text)} />
        <FormTextInput label="Long description" required value={formData.descLong} placeholder="Describe this cat" multiline onChangeText={(text) => handleChange('descLong', text)} />
      </FormSection>
      <FormSection title="Status">
        <SelectField label="Current status" required picker={pickers.statusPicker} placeholder="Select a current status" zIndex={4000} />
        <SelectField label="Fur length" required picker={pickers.furPicker} placeholder="Select a fur length" zIndex={3000} />
        <SelectField label="TNR status" required picker={pickers.tnrPicker} placeholder="Select a TNR status" zIndex={2000} />
        <SelectField label="Sex" required picker={pickers.sexPicker} placeholder="Select sex" zIndex={1000} />
      </FormSection>
      <FormSection title="Field notes">
        <FormTextInput label="Detailed color pattern" required value={formData.colorPattern} placeholder="Colors and unique features" onChangeText={(text) => handleChange('colorPattern', text)} />
        <FormTextInput label="Behavior" value={formData.behavior} placeholder="How does this cat act?" multiline onChangeText={(text) => handleChange('behavior', text)} />
        <FormTextInput label="Years recorded" required value={formData.yearsRecorded} placeholder="Years this cat has been seen" onChangeText={(text) => handleChange('yearsRecorded', text)} />
        <FormTextInput label="Area of residence" required value={formData.AoR} placeholder="Where does this cat spend time?" onChangeText={(text) => handleChange('AoR', text)} />
        <FormTextInput label="Fur pattern" required value={formData.furPattern} placeholder="Calico, tabby, black and white…" onChangeText={(text) => handleChange('furPattern', text)} />
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
      <FormSection title="Credits">
        <FormTextInput
          label="Sources and credits"
          value={formData.credits}
          placeholder="Photo sources and writing credits"
          multiline
          onChangeText={(text) => handleChange('credits', text)}
        />
      </FormSection>
    </>
  );
};

export { CatalogForm };
