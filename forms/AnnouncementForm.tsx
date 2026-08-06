import React from 'react';

import { FormSection } from '@/components/design';
import { FormTextInput, PhotoField } from '@/components/forms';

export interface AnnouncementFormData {
  readonly title: string;
  readonly info: string;
  readonly authorAlias: string;
}

interface AnnouncementFormProps {
  readonly formData: AnnouncementFormData;
  readonly setFormData: React.Dispatch<React.SetStateAction<AnnouncementFormData>>;
  readonly photos: readonly string[];
  readonly setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
}

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  formData,
  setFormData,
  photos,
  setPhotos,
}) => {
  const handleChange = (field: keyof AnnouncementFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };
  const promote = (uri: string) =>
    setPhotos((current) => [uri, ...current.filter((photo) => photo !== uri)]);

  return (
    <>
      <FormSection title="Basics">
        <FormTextInput
          label="Title"
          required
          value={formData.title}
          placeholder="Announcement title"
          onChangeText={(text) => handleChange('title', text)}
        />
        <FormTextInput
          label="Description"
          required
          value={formData.info}
          placeholder="Share the announcement details."
          multiline
          onChangeText={(text) => handleChange('info', text)}
        />
      </FormSection>
      <FormSection title="Photos">
        <PhotoField
          photos={photos}
          coverUri={photos[0]}
          onAddPhoto={(uri) => setPhotos((current) => [...current, uri])}
          onPromotePhoto={promote}
          onRemovePhoto={(uri) =>
            setPhotos((current) => current.filter((photo) => photo !== uri))
          }
        />
      </FormSection>
      <FormSection title="Credits">
        <FormTextInput
          label="Author alias"
          helper="Optional—when blank, the contributor ID remains visible."
          value={formData.authorAlias}
          placeholder="Campus Cats Team"
          onChangeText={(text) => handleChange('authorAlias', text)}
        />
      </FormSection>
    </>
  );
};

export { AnnouncementForm };
