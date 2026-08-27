import React from 'react';
import { View } from 'react-native';

import { AppText, Chip, FormSection } from '@/components/design';
import { FormTextInput, PhotoField, SelectField } from '@/components/forms';
import { CatalogTag, CatStatus, Fur, Sex, TNRStatus } from '@/core/domain';
import { useAppTheme } from '@/theme';
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

export type CatalogRequiredField =
  | 'name'
  | 'descShort'
  | 'descLong'
  | 'colorPattern'
  | 'yearsRecorded'
  | 'AoR'
  | 'furPattern'
  | 'photos';
export type CatalogFormSection = 'basics' | 'fieldNotes' | 'photos';
export type CatalogFormErrors = Partial<
  Record<CatalogRequiredField, string>
>;

const requiredFieldOrder: readonly CatalogRequiredField[] = [
  'name',
  'descShort',
  'descLong',
  'colorPattern',
  'yearsRecorded',
  'AoR',
  'furPattern',
  'photos',
];

export const validateCatalogForm = ({
  formData,
  photos,
}: {
  formData: CatalogFormData;
  photos: readonly string[];
}): CatalogFormErrors => {
  const errors: CatalogFormErrors = {};
  if (!formData.name.trim()) errors.name = 'Cat name is required.';
  if (!formData.descShort.trim()) {
    errors.descShort = 'Short description is required.';
  }
  if (!formData.descLong.trim()) {
    errors.descLong = 'Long description is required.';
  }
  if (!formData.colorPattern.trim()) {
    errors.colorPattern = 'Detailed color pattern is required.';
  }
  if (!formData.yearsRecorded.trim()) {
    errors.yearsRecorded = 'Years recorded is required.';
  }
  if (!formData.AoR.trim()) {
    errors.AoR = 'Area of residence is required.';
  }
  if (!formData.furPattern.trim()) {
    errors.furPattern = 'Fur pattern is required.';
  }
  if (photos.length === 0) errors.photos = 'At least one photo is required.';
  return errors;
};

export const firstCatalogErrorField = (
  errors: CatalogFormErrors,
): CatalogRequiredField | undefined =>
  requiredFieldOrder.find((field) => errors[field]);

export const catalogSectionForField = (
  field: CatalogRequiredField,
): CatalogFormSection => {
  if (field === 'photos') return 'photos';
  if (
    field === 'colorPattern' ||
    field === 'yearsRecorded' ||
    field === 'AoR' ||
    field === 'furPattern'
  ) {
    return 'fieldNotes';
  }
  return 'basics';
};

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
  onPromotePhoto?: (uri: string) => void;
  onDeletePhoto?: (uri: string) => void;
  sourceManaged?: boolean;
  availableTags: readonly CatalogTag[];
  selectedTagIds: readonly string[];
  onSelectedTagIdsChange: (tagIds: readonly string[]) => void;
  errors?: CatalogFormErrors;
  onSectionLayout?: (section: CatalogFormSection, y: number) => void;
  onRequiredFieldLayout?: (
    field: CatalogRequiredField,
    section: CatalogFormSection,
    y: number,
  ) => void;
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
  sourceManaged = false,
  availableTags,
  selectedTagIds,
  onSelectedTagIdsChange,
  errors = {},
  onSectionLayout,
  onRequiredFieldLayout,
}) => {
  const theme = useAppTheme();
  const handleChange = (field: keyof CatalogFormData, value: string) =>
    setFormData((current) => ({ ...current, [field]: value }));
  const displayedPhotos = profile ? [profile, ...photos] : photos;
  const localFieldsRequired = !sourceManaged;
  const promote = onPromotePhoto ?? ((uri: string) =>
    setPhotos((current) => [uri, ...current.filter((photo) => photo !== uri)]));
  const remove = onDeletePhoto ?? ((uri: string) =>
    setPhotos((current) => current.filter((photo) => photo !== uri)));

  return (
    <>
      <FormSection
        title="Basics"
        testID="catalog-section-basics"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('basics', nativeEvent.layout.y)
        }
      >
        <View
          testID="catalog-field-name"
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('name', 'basics', nativeEvent.layout.y)
          }
        >
          <FormTextInput label="Cat name" required={localFieldsRequired} error={errors.name} value={formData.name} placeholder="Name" onChangeText={(text) => handleChange('name', text)} />
        </View>
        <View
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('descShort', 'basics', nativeEvent.layout.y)
          }
        >
          <FormTextInput label="Short description" required={localFieldsRequired} error={errors.descShort} value={formData.descShort} placeholder="A short descriptive phrase" onChangeText={(text) => handleChange('descShort', text)} />
        </View>
        <View
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('descLong', 'basics', nativeEvent.layout.y)
          }
        >
          <FormTextInput label="Long description" required={localFieldsRequired} error={errors.descLong} value={formData.descLong} placeholder="Describe this cat" multiline onChangeText={(text) => handleChange('descLong', text)} />
        </View>
      </FormSection>
      <FormSection title="Status">
        <SelectField label="Current status" required picker={pickers.statusPicker} placeholder="Select a current status" />
        <SelectField label="Fur length" required picker={pickers.furPicker} placeholder="Select a fur length" />
        <SelectField label="TNR status" required picker={pickers.tnrPicker} placeholder="Select a TNR status" />
        <SelectField label="Sex" required picker={pickers.sexPicker} placeholder="Select sex" />
      </FormSection>
      <FormSection title="Tags">
        <AppText color="muted">
          Status-based defaults are selected automatically until you change them.
        </AppText>
        {availableTags.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
            {availableTags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <Chip
                  key={tag.id}
                  label={tag.label}
                  selected={selected}
                  onPress={() => onSelectedTagIdsChange(
                    selected
                      ? selectedTagIds.filter((id) => id !== tag.id)
                      : [...selectedTagIds, tag.id],
                  )}
                />
              );
            })}
          </View>
        ) : (
          <AppText color="muted">No catalog tags are configured.</AppText>
        )}
      </FormSection>
      <FormSection
        title="Field notes"
        onLayout={({ nativeEvent }) =>
          onSectionLayout?.('fieldNotes', nativeEvent.layout.y)
        }
      >
        <View
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('colorPattern', 'fieldNotes', nativeEvent.layout.y)
          }
        >
          <FormTextInput label="Detailed color pattern" required={localFieldsRequired} error={errors.colorPattern} value={formData.colorPattern} placeholder="Colors and unique features" onChangeText={(text) => handleChange('colorPattern', text)} />
        </View>
        <FormTextInput label="Behavior" value={formData.behavior} placeholder="How does this cat act?" multiline onChangeText={(text) => handleChange('behavior', text)} />
        <View
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('yearsRecorded', 'fieldNotes', nativeEvent.layout.y)
          }
        >
          <FormTextInput label="Years recorded" required={localFieldsRequired} error={errors.yearsRecorded} value={formData.yearsRecorded} placeholder="Years this cat has been seen" onChangeText={(text) => handleChange('yearsRecorded', text)} />
        </View>
        <View
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('AoR', 'fieldNotes', nativeEvent.layout.y)
          }
        >
          <FormTextInput label="Area of residence" required={localFieldsRequired} error={errors.AoR} value={formData.AoR} placeholder="Where does this cat spend time?" onChangeText={(text) => handleChange('AoR', text)} />
        </View>
        <View
          onLayout={({ nativeEvent }) =>
            onRequiredFieldLayout?.('furPattern', 'fieldNotes', nativeEvent.layout.y)
          }
        >
          <FormTextInput label="Fur pattern" required={localFieldsRequired} error={errors.furPattern} value={formData.furPattern} placeholder="Calico, tabby, black and white…" onChangeText={(text) => handleChange('furPattern', text)} />
        </View>
      </FormSection>
      <FormSection
        title={localFieldsRequired ? 'Photos *' : 'Photos'}
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
            required={localFieldsRequired}
            validationError={errors.photos}
            photos={displayedPhotos}
            coverUri={profile || photos[0]}
            onAddPhoto={sourceManaged ? undefined : (uri) => setPhotos((current) => [...current, uri])}
            onPromotePhoto={promote}
            onRemovePhoto={sourceManaged ? undefined : remove}
          />
        </View>
        {sourceManaged ? (
          <AppText color="muted">
            Licensed iNaturalist photos remain hosted by their source. Choose which one appears as the cover.
          </AppText>
        ) : null}
      </FormSection>
      <FormSection title="Credits">
        <FormTextInput
          label="Sources and credits"
          value={formData.credits}
          placeholder="Photo sources and writing credits"
          multiline
          editable={!sourceManaged}
          helper={sourceManaged ? 'Attribution and licensing come from iNaturalist.' : undefined}
          onChangeText={(text) => handleChange('credits', text)}
        />
      </FormSection>
    </>
  );
};

export { CatalogForm };
