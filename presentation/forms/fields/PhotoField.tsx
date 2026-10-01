import { useState } from 'react';
import { Alert, View } from 'react-native';

import { appModules } from '@/composition/appModules';
import { AppText, FormField, MediaPicker } from '@/presentation/ui';

import { CircularImageCropper } from '../CircularImageCropper';

interface PhotoFieldProps {
  readonly photos: readonly string[];
  readonly label?: string;
  readonly mode?: 'gallery' | 'single';
  readonly presentation?: 'default' | 'avatar';
  readonly crop?: 'circle';
  readonly hideLabel?: boolean;
  readonly helper?: string;
  readonly required?: boolean;
  readonly validationError?: string;
  readonly coverUri?: string;
  readonly onAddPhoto?: (uri: string) => void;
  readonly onPromotePhoto?: (uri: string) => void;
  readonly onRemovePhoto?: (uri: string) => void;
}

export const PhotoField = ({
  photos,
  label = 'Photos',
  mode = 'gallery',
  presentation = 'default',
  crop,
  hideLabel,
  helper,
  required,
  validationError,
  coverUri,
  onAddPhoto,
  onPromotePhoto,
  onRemovePhoto,
}: PhotoFieldProps) => {
  const [error, setError] = useState<string>();
  const [pendingCropUri, setPendingCropUri] = useState<string>();
  const guidance =
    helper ??
    (mode === 'gallery'
      ? 'The cover photo appears first on cards and detail pages.'
      : undefined);
  const select = async (camera: boolean) => {
    const result = camera
      ? await appModules.imageSelection.takePhoto()
      : await appModules.imageSelection.pickFromLibrary();
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    if (!result.value) return;
    if (crop === 'circle') {
      setPendingCropUri(result.value.localUri);
      return;
    }
    onAddPhoto?.(result.value.localUri);
  };
  const promptTitle =
    mode === 'single' ? `Choose a ${label.toLocaleLowerCase()}` : 'Add a photo';
  const prompt = () =>
    Alert.alert(promptTitle, 'Choose a photo source.', [
      { text: 'Take photo', onPress: () => void select(true) },
      { text: 'Choose from library', onPress: () => void select(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <FormField
      label={label}
      hideLabel={hideLabel}
      required={required}
      error={validationError}
      helper={guidance}
    >
      <View accessibilityLabel={`${label} field`}>
        <MediaPicker
          photos={photos}
          coverUri={coverUri}
          mode={mode}
          presentation={presentation}
          photoLabel={label}
          invalid={Boolean(validationError)}
          onAdd={onAddPhoto ? prompt : undefined}
          onPromote={onPromotePhoto}
          onRemove={onRemovePhoto}
        />
      </View>
      {error ? (
        <AppText color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      {pendingCropUri ? (
        <CircularImageCropper
          uri={pendingCropUri}
          onCancel={() => setPendingCropUri(undefined)}
          onComplete={(uri) => {
            setPendingCropUri(undefined);
            onAddPhoto?.(uri);
          }}
        />
      ) : null}
    </FormField>
  );
};
