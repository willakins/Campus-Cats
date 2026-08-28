import React from 'react';
import { Image, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Button } from './Actions';
import { StatusPill } from './Status';

interface MediaPickerProps {
  readonly photos: readonly string[];
  readonly coverUri?: string;
  readonly mode?: 'gallery' | 'single';
  readonly photoLabel?: string;
  readonly onAdd?: () => void;
  readonly onPromote?: (uri: string) => void;
  readonly onRemove?: (uri: string) => void;
}

export const MediaPicker = ({
  photos,
  coverUri,
  mode = 'gallery',
  photoLabel = 'Photo',
  onAdd,
  onPromote,
  onRemove,
}: MediaPickerProps) => {
  const theme = useAppTheme();

  if (mode === 'single') {
    const photo = photos[0];
    const controlLabel = photoLabel.toLocaleLowerCase();
    return (
      <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            accessibilityLabel={`${photoLabel} preview`}
            style={{
              width: 160,
              height: 160,
              borderRadius: theme.radii.pill,
            }}
          />
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: theme.spacing.xs,
          }}
        >
          {onAdd ? (
            <Button
              label={`${photo ? 'Change' : 'Add'} ${controlLabel}`}
              icon="camera-outline"
              variant="secondary"
              size="small"
              onPress={onAdd}
            />
          ) : null}
          {photo && onRemove ? (
            <Button
              label={`Remove ${controlLabel}`}
              variant="danger"
              size="small"
              onPress={() => onRemove(photo)}
            />
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      {onAdd ? (
        <Button label="Add photos" icon="camera-outline" variant="secondary" onPress={onAdd} />
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {photos.map((uri, index) => {
          const isCover = uri === coverUri || (!coverUri && index === 0);
          return (
            <View
              key={`${uri}-${index}`}
              style={{
                width: 144,
                gap: theme.spacing.xs,
                padding: theme.spacing.xs,
                borderRadius: theme.radii.field,
                backgroundColor: theme.colors.surfaceSubtle,
              }}
            >
              <Image
                source={{ uri }}
                accessibilityLabel={`Photo ${index + 1}`}
                style={{ width: '100%', aspectRatio: 1, borderRadius: theme.radii.field }}
              />
              {isCover ? <StatusPill tone="primary" label="Cover photo" icon="star" /> : onPromote ? (
                <Button
                  label={`Set photo ${index + 1} as cover`}
                  size="small"
                  variant="tertiary"
                  onPress={() => onPromote(uri)}
                />
              ) : null}
              {onRemove ? (
                <Button
                  label={`Remove photo ${index + 1}`}
                  size="small"
                  variant="danger"
                  onPress={() => onRemove(uri)}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};
