import React, { useState } from 'react';
import {
  Alert,
  Switch,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import DropdownPicker from 'react-native-dropdown-picker';

import { appModules } from '../../composition/appModules';
import { Coordinates } from '../../core/domain';
import { useAppTheme } from '../../theme';
import { PickerConfig } from '../../types';
import { AppText, FormField, MediaPicker } from '../design';
import { campusMapDarkStyle } from '../mapStyles';
import { createCampusCamera, GEORGIA_TECH_CENTER } from '../mapViewport';
import { DateTimeInput } from '../ui/DateTimeInput';
import { MapMarker } from '../ui/MapMarker';
import { MapView } from '../ui/MapView';

interface FormTextInputProps extends TextInputProps {
  readonly label: string;
  readonly required?: boolean;
  readonly helper?: string;
  readonly error?: string;
}

export const FormTextInput = ({
  label,
  required,
  helper,
  error,
  style,
  multiline,
  ...props
}: FormTextInputProps) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <FormField label={label} required={required} helper={helper} error={error}>
      {({ inputId, describedBy }) => (
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={describedBy}
          nativeID={inputId}
          maxFontSizeMultiplier={2}
          multiline={multiline}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.primary}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[
            theme.typography.body,
            {
              minHeight: multiline ? 112 : theme.layout.minTouchTarget,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              borderWidth: focused ? 2 : 1,
              borderColor: error
                ? theme.colors.danger
                : focused
                  ? theme.colors.primary
                  : theme.colors.border,
              borderRadius: theme.radii.field,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            style,
          ]}
          {...props}
        />
      )}
    </FormField>
  );
};

interface SelectFieldProps<Value extends string> {
  readonly label: string;
  readonly required?: boolean;
  readonly picker: PickerConfig<Value>;
  readonly placeholder: string;
  readonly zIndex?: number;
}

export const SelectField = <Value extends string>({
  label,
  required,
  picker,
  placeholder,
  zIndex,
}: SelectFieldProps<Value>) => {
  const theme = useAppTheme();
  return (
    <FormField label={label} required={required}>
      <View accessibilityLabel={label}>
        <DropdownPicker
          open={picker.open}
          value={picker.value}
          items={picker.items}
          setOpen={picker.setOpen}
          setValue={picker.setValue}
          setItems={picker.setItems}
          placeholder={placeholder}
          multiple={false}
          zIndex={zIndex}
          style={{
            minHeight: theme.layout.minTouchTarget,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.field,
            backgroundColor: theme.colors.surface,
          }}
          dropDownContainerStyle={{
            borderColor: theme.colors.border,
            borderRadius: theme.radii.field,
            backgroundColor: theme.colors.surface,
          }}
          textStyle={{ ...theme.typography.body, color: theme.colors.text }}
          placeholderStyle={{ color: theme.colors.textMuted }}
          listItemLabelStyle={{ color: theme.colors.text }}
        />
      </View>
    </FormField>
  );
};

export const ToggleField = ({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => {
  const theme = useAppTheme();
  return (
    <View
      style={{
        minHeight: theme.layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
      }}
    >
      <AppText style={{ flex: 1 }}>{label}</AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primarySurface }}
        thumbColor={value ? theme.colors.primary : theme.colors.textMuted}
      />
    </View>
  );
};

export const DateField = ({
  label,
  date,
  onChange,
}: {
  label: string;
  date: Date;
  onChange: (date: Date) => void;
}) => (
  <FormField label={label} required>
    <DateTimeInput date={date} setDate={onChange} />
  </FormField>
);

export const LocationField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Coordinates;
  onChange: (coordinates: Coordinates) => void;
}) => {
  const theme = useAppTheme();
  const hasLocation = value.latitude !== 0 || value.longitude !== 0;
  return (
    <FormField label={label} required helper="Tap the map to place the marker.">
      <View style={{ height: 240, overflow: 'hidden', borderRadius: theme.radii.card }}>
        <MapView
          accessibilityLabel={label}
          style={{ flex: 1 }}
          userInterfaceStyle={theme.dark ? 'dark' : 'light'}
          customMapStyle={theme.dark ? [...campusMapDarkStyle] : undefined}
          initialCamera={createCampusCamera(hasLocation ? value : GEORGIA_TECH_CENTER)}
          onPress={(event) => onChange(event.nativeEvent.coordinate)}
        >
          {hasLocation ? <MapMarker coordinate={value} /> : null}
        </MapView>
      </View>
    </FormField>
  );
};

interface PhotoFieldProps {
  readonly photos: readonly string[];
  readonly coverUri?: string;
  readonly onAddPhoto?: (uri: string) => void;
  readonly onPromotePhoto?: (uri: string) => void;
  readonly onRemovePhoto?: (uri: string) => void;
}

export const PhotoField = ({
  photos,
  coverUri,
  onAddPhoto,
  onPromotePhoto,
  onRemovePhoto,
}: PhotoFieldProps) => {
  const [error, setError] = useState<string>();
  const select = async (camera: boolean) => {
    const result = camera
      ? await appModules.imageSelection.takePhoto()
      : await appModules.imageSelection.pickFromLibrary();
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    if (result.value) onAddPhoto?.(result.value.localUri);
  };
  const prompt = () =>
    Alert.alert('Add a photo', 'Choose a photo source.', [
      { text: 'Take photo', onPress: () => void select(true) },
      { text: 'Choose from library', onPress: () => void select(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <FormField label="Photos" helper="The cover photo appears first on cards and detail pages.">
      <MediaPicker
        photos={photos}
        coverUri={coverUri}
        onAdd={onAddPhoto ? prompt : undefined}
        onPromote={onPromotePhoto}
        onRemove={onRemovePhoto}
      />
      {error ? <AppText color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
    </FormField>
  );
};
