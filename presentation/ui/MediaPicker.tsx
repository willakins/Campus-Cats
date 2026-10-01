import React from 'react';
import { Image, Pressable, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/theme';
import { Button } from './Actions';
import { StatusPill } from './Status';
import { AppText } from './Typography';

interface MediaPickerProps {
  readonly photos: readonly string[];
  readonly coverUri?: string;
  readonly mode?: 'gallery' | 'single';
  readonly presentation?: 'default' | 'avatar';
  readonly photoLabel?: string;
  readonly invalid?: boolean;
  readonly onAdd?: () => void;
  readonly onPromote?: (uri: string) => void;
  readonly onRemove?: (uri: string) => void;
}

export const MediaPicker = ({
  photos,
  coverUri,
  mode = 'gallery',
  presentation = 'default',
  photoLabel = 'Photo',
  invalid = false,
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
        ) : presentation === 'avatar' && onAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${controlLabel}`}
            onPress={onAdd}
            style={({ pressed }) => ({
              width: 160,
              height: 160,
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.xs,
              borderRadius: theme.radii.pill,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: invalid
                ? theme.colors.danger
                : theme.colors.violet,
              backgroundColor: theme.colors.violetSurface,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons
              name="camera-outline"
              size={34}
              color={theme.colors.violet}
            />
            <AppText variant="label" style={{ color: theme.colors.violet }}>
              Add photo
            </AppText>
          </Pressable>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: theme.spacing.xs,
          }}
        >
          {onAdd && (photo || presentation !== 'avatar') ? (
            <Button
              label={`${photo ? 'Change' : 'Add'} ${controlLabel}`}
              icon="camera-outline"
              variant="secondary"
              size="small"
              onPress={onAdd}
              style={
                invalid
                  ? { borderWidth: 2, borderColor: theme.colors.danger }
                  : undefined
              }
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
        <Button
          label="Add photos"
          icon="camera-outline"
          variant="secondary"
          onPress={onAdd}
          style={
            invalid
              ? { borderWidth: 2, borderColor: theme.colors.danger }
              : undefined
          }
        />
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'stretch',
          gap: theme.spacing.sm,
        }}
      >
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
                  style={{ marginTop: 'auto' }}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};
