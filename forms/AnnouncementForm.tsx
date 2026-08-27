import React from 'react';
import { View } from 'react-native';

import { FormSection } from '@/components/design';
import { FormTextInput, PhotoField } from '@/components/forms';

export interface AnnouncementFormData {
  readonly title: string;
  readonly info: string;
  readonly authorAlias: string;
}

export type AnnouncementRequiredField = 'title' | 'info';
export type AnnouncementFormSection = 'basics';
export type AnnouncementFormErrors = Partial<
  Record<AnnouncementRequiredField, string>
>;

const requiredFieldOrder: readonly AnnouncementRequiredField[] = [
  'title',
  'info',
];

export const validateAnnouncementForm = (
  formData: AnnouncementFormData,
): AnnouncementFormErrors => {
  const errors: AnnouncementFormErrors = {};
  if (!formData.title.trim()) errors.title = 'Announcement title is required.';
  if (!formData.info.trim()) {
    errors.info = 'Announcement description is required.';
  }
  return errors;
};

export const firstAnnouncementErrorField = (
  errors: AnnouncementFormErrors,
): AnnouncementRequiredField | undefined =>
  requiredFieldOrder.find((field) => errors[field]);

interface AnnouncementFormProps {
  readonly formData: AnnouncementFormData;
  readonly setFormData: React.Dispatch<
    React.SetStateAction<AnnouncementFormData>
  >;
  readonly photos: readonly string[];
  readonly setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  readonly errors?: AnnouncementFormErrors;
  readonly onSectionLayout?: (
    section: AnnouncementFormSection,
    y: number,
  ) => void;
  readonly onRequiredFieldLayout?: (
    field: AnnouncementRequiredField,
    section: AnnouncementFormSection,
    y: number,
  ) => void;
}

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  formData,
  setFormData,
  photos,
  setPhotos,
  errors = {},
  onSectionLayout,
  onRequiredFieldLayout,
}) => {
  const handleChange = (field: keyof AnnouncementFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };
  const promote = (uri: string) =>
    setPhotos((current) => [uri, ...current.filter((photo) => photo !== uri)]);

  return (
    <>
      <FormSection
        title="Basics"
        testID="announcement-section-basics"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('basics', nativeEvent.layout.y)
        }
      >
        <View
          testID="announcement-field-title"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('title', 'basics', nativeEvent.layout.y)
          }
        >
          <FormTextInput
            label="Title"
            required
            error={errors.title}
            value={formData.title}
            placeholder="Announcement title"
            onChangeText={(text) => handleChange('title', text)}
          />
        </View>
        <View
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('info', 'basics', nativeEvent.layout.y)
          }
        >
          <FormTextInput
            label="Description"
            required
            error={errors.info}
            value={formData.info}
            placeholder="Share the announcement details."
            multiline
            onChangeText={(text) => handleChange('info', text)}
          />
        </View>
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
