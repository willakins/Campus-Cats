import React, { useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  Switch,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { appModules } from '../../composition/appModules';
import { Coordinates } from '../../core/domain';
import { useAppTheme } from '../../theme';
import { PickerConfig } from '../../types';
import { AppText, FormField, MediaPicker } from '../design';
import { createCampusViewport, GEORGIA_TECH_CENTER } from '../mapViewport';
import { DateTimeInput } from '../ui/DateTimeInput';
import { MapView } from '../ui/MapView';

interface FormTextInputProps extends TextInputProps {
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly helper?: string;
  readonly required?: boolean;
  readonly error?: string;
  readonly containerStyle?: StyleProp<ViewStyle>;
}

export const FormTextInput = ({
  label,
  hideLabel,
  required,
  helper,
  error,
  containerStyle,
  style,
  multiline,
  onFocus,
  onBlur,
  ...props
}: FormTextInputProps) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <FormField
      label={label}
      hideLabel={hideLabel}
      required={required}
      helper={helper}
      error={error}
      style={containerStyle}
    >
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
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
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
  readonly error?: string;
  readonly picker: PickerConfig<Value>;
  readonly placeholder: string;
}

interface SelectAnchor {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const MAX_SELECT_POPUP_HEIGHT = 280;
const MIN_SELECT_POPUP_WIDTH = 220;

export const SelectField = <Value extends string>({
  label,
  required,
  error,
  picker,
  placeholder,
}: SelectFieldProps<Value>) => {
  const theme = useAppTheme();
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<SelectAnchor>();
  const { width: viewportWidth, height: viewportHeight } =
    useWindowDimensions();
  const selectedItem = picker.items.find(({ value }) => value === picker.value);
  const gutter = theme.layout.screenGutter;
  const availableWidth = Math.max(0, viewportWidth - gutter * 2);
  const popupHeight = Math.min(
    picker.items.length * theme.layout.minTouchTarget + 2,
    MAX_SELECT_POPUP_HEIGHT,
    Math.max(theme.layout.minTouchTarget, viewportHeight - gutter * 2),
  );
  const fallbackAnchor: SelectAnchor = {
    x: gutter,
    y: Math.max(gutter, (viewportHeight - popupHeight) / 2),
    width: availableWidth,
    height: 0,
  };
  const resolvedAnchor = anchor ?? fallbackAnchor;
  const popupWidth = Math.min(
    Math.max(resolvedAnchor.width, MIN_SELECT_POPUP_WIDTH),
    availableWidth,
  );
  const popupLeft = Math.max(
    gutter,
    Math.min(resolvedAnchor.x, viewportWidth - popupWidth - gutter),
  );
  const popupBelow =
    resolvedAnchor.y + resolvedAnchor.height + theme.spacing.xxs;
  const popupTop =
    popupBelow + popupHeight <= viewportHeight - gutter
      ? popupBelow
      : Math.max(
          gutter,
          resolvedAnchor.y - popupHeight - theme.spacing.xxs,
        );

  const measureTrigger = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) setAnchor({ x, y, width, height });
    });
  };

  const closeOptions = () => picker.setOpen(false);

  const toggleOptions = () => {
    if (picker.open) {
      closeOptions();
      return;
    }
    measureTrigger();
    picker.setOpen(true);
  };

  return (
    <FormField label={label} required={required} error={error}>
      <View
        ref={triggerRef}
        collapsable={false}
        onLayout={measureTrigger}
      >
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityState={{ expanded: picker.open }}
          onPress={toggleOptions}
          style={({ pressed }) => ({
            minHeight: theme.layout.minTouchTarget,
            paddingHorizontal: theme.spacing.sm,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderWidth: 1,
            borderRadius: theme.radii.field,
            backgroundColor: theme.colors.surface,
            opacity: pressed ? 0.8 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.sm,
          })}
        >
          <AppText
            numberOfLines={1}
            style={{
              flex: 1,
              color: selectedItem
                ? theme.colors.text
                : theme.colors.textMuted,
            }}
          >
            {selectedItem?.label ?? placeholder}
          </AppText>
          <Ionicons
            name={picker.open ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.textMuted}
          />
        </Pressable>
      </View>
      {picker.open ? (
        <Modal
          visible
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={closeOptions}
        >
          <View style={{ flex: 1 }}>
            <Pressable
              accessibilityLabel={`Close ${label} options`}
              onPress={closeOptions}
              style={{ position: 'absolute', inset: 0 }}
            />
            <View
              accessibilityLabel={`${label} options`}
              accessibilityRole="menu"
              accessibilityViewIsModal
              style={[
                theme.elevation.floating,
                {
                  position: 'absolute',
                  top: popupTop,
                  left: popupLeft,
                  width: popupWidth,
                  maxHeight: popupHeight,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.field,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
                {picker.items.map((item, index) => {
                  const selected = item.value === picker.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityLabel={`Select ${item.label}`}
                      accessibilityRole="menuitem"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        picker.setValue(item.value as Value);
                        closeOptions();
                      }}
                      style={({ pressed }) => ({
                        minHeight: theme.layout.minTouchTarget,
                        paddingHorizontal: theme.spacing.sm,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: theme.spacing.sm,
                        borderBottomWidth:
                          index === picker.items.length - 1 ? 0 : 1,
                        borderBottomColor: theme.colors.border,
                        backgroundColor:
                          selected || pressed
                            ? theme.colors.primarySurface
                            : theme.colors.surface,
                      })}
                    >
                      <AppText
                        style={{
                          flex: 1,
                          color: selected
                            ? theme.colors.primary
                            : theme.colors.text,
                        }}
                      >
                        {item.label}
                      </AppText>
                      {selected ? (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={theme.colors.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
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
  maximumDate,
  error,
  onChange,
}: {
  label: string;
  date: Date;
  maximumDate?: Date;
  error?: string;
  onChange: (date: Date) => void;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <FormField
      label={label}
      required
      error={error}
      onLabelPress={() => setPickerOpen(true)}
    >
      <DateTimeInput
        date={date}
        maximumDate={maximumDate}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        setDate={onChange}
      />
    </FormField>
  );
};

export const LocationField = ({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: Coordinates;
  error?: string;
  onChange: (coordinates: Coordinates) => void;
}) => {
  const theme = useAppTheme();
  const hasLocation = value.latitude !== 0 || value.longitude !== 0;
  const lastSelectedCenter = useRef(
    hasLocation ? value : GEORGIA_TECH_CENTER,
  );
  return (
    <FormField
      label={label}
      required
      helper="Drag the map to position the pin."
      error={error}
    >
      <View
        accessibilityLabel={`${label} field`}
        style={{
          height: 240,
          overflow: 'hidden',
          borderWidth: error ? 2 : 0,
          borderColor: theme.colors.danger,
          borderRadius: theme.radii.card,
        }}
      >
        <MapView
          accessibilityLabel={label}
          style={{ flex: 1 }}
          appearance={theme.dark ? 'dark' : 'light'}
          initialViewport={createCampusViewport(
            hasLocation ? value : GEORGIA_TECH_CENTER,
          )}
          onCenterChange={(center) => {
            if (sameCoordinates(center, lastSelectedCenter.current)) return;
            lastSelectedCenter.current = center;
            onChange(center);
          }}
        />
        <View
          style={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <View
            accessible
            accessibilityLabel={`${label} pin`}
            accessibilityRole="image"
            style={{ transform: [{ translateY: -20 }] }}
          >
            <Ionicons
              name="location-sharp"
              size={44}
              color={theme.colors.coral}
            />
          </View>
        </View>
      </View>
    </FormField>
  );
};

const sameCoordinates = (left: Coordinates, right: Coordinates) =>
  Math.abs(left.latitude - right.latitude) < 0.000001 &&
  Math.abs(left.longitude - right.longitude) < 0.000001;

interface PhotoFieldProps {
  readonly photos: readonly string[];
  readonly label?: string;
  readonly mode?: 'gallery' | 'single';
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
  hideLabel,
  helper,
  required,
  validationError,
  coverUri,
  onAddPhoto,
  onPromotePhoto,
  onRemovePhoto,
}: PhotoFieldProps) => {
  const theme = useAppTheme();
  const [error, setError] = useState<string>();
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
    if (result.value) onAddPhoto?.(result.value.localUri);
  };
  const promptTitle =
    mode === 'single'
      ? `Choose a ${label.toLocaleLowerCase()}`
      : 'Add a photo';
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
      <View
        accessibilityLabel={`${label} field`}
        style={{
          padding: validationError ? theme.spacing.xs : 0,
          borderWidth: validationError ? 2 : 0,
          borderColor: theme.colors.danger,
          borderRadius: theme.radii.field,
        }}
      >
        <MediaPicker
          photos={photos}
          coverUri={coverUri}
          mode={mode}
          photoLabel={label}
          onAdd={onAddPhoto ? prompt : undefined}
          onPromote={onPromotePhoto}
          onRemove={onRemovePhoto}
        />
      </View>
      {error ? <AppText color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
    </FormField>
  );
};
