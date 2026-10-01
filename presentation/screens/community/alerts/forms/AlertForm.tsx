import React from 'react';
import { View } from 'react-native';

import { FormSection } from '@/presentation/ui';
import { FormTextInput, PhotoField } from '@/presentation/forms';

export interface AlertFormData {
  readonly title: string;
  readonly info: string;
  readonly authorAlias: string;
}

export type AlertRequiredField = 'title' | 'info';
export type AlertFormSection = 'basics';
export type AlertFormErrors = Partial<
  Record<AlertRequiredField, string>
>;

const requiredFieldOrder: readonly AlertRequiredField[] = [
  'title',
  'info',
];

export const validateAlertForm = (
  formData: AlertFormData,
): AlertFormErrors => {
  const errors: AlertFormErrors = {};
  if (!formData.title.trim()) errors.title = 'Alert title is required.';
  if (!formData.info.trim()) {
    errors.info = 'Alert description is required.';
  }
  return errors;
};

export const firstAlertErrorField = (
  errors: AlertFormErrors,
): AlertRequiredField | undefined =>
  requiredFieldOrder.find((field) => errors[field]);

interface AlertFormProps {
  readonly formData: AlertFormData;
  readonly setFormData: React.Dispatch<
    React.SetStateAction<AlertFormData>
  >;
  readonly photos: readonly string[];
  readonly setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  readonly errors?: AlertFormErrors;
  readonly onSectionLayout?: (
    section: AlertFormSection,
    y: number,
  ) => void;
  readonly onRequiredFieldLayout?: (
    field: AlertRequiredField,
    section: AlertFormSection,
    y: number,
  ) => void;
}

const AlertForm: React.FC<AlertFormProps> = ({
  formData,
  setFormData,
  photos,
  setPhotos,
  errors = {},
  onSectionLayout,
  onRequiredFieldLayout,
}) => {
  const handleChange = (field: keyof AlertFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };
  const promote = (uri: string) =>
    setPhotos((current) => [uri, ...current.filter((photo) => photo !== uri)]);

  return (
    <>
      <FormSection
        title="Basics"
        testID="alert-section-basics"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('basics', nativeEvent.layout.y)
        }
      >
        <View
          testID="alert-field-title"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('title', 'basics', nativeEvent.layout.y)
          }
        >
          <FormTextInput
            label="Title"
            required
            error={errors.title}
            value={formData.title}
            placeholder="Alert title"
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
            placeholder="Share the alert details."
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

export { AlertForm };
