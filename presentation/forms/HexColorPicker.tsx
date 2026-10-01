import { useCallback, useState } from 'react';
import { GestureResponderEvent, Pressable, View } from 'react-native';

import { useAppTheme } from '@/theme';
import { AppText, Button, Dialog, FormField } from '@/presentation/ui';
import { FormTextInput } from './fields/FormTextInput';

const MAX_SPECTRUM_HUE = 300;
const SPECTRUM_COLUMNS = 36;
const SPECTRUM_ROWS = 20;

const channelToHex = (channel: number): string =>
  Math.round(channel * 255).toString(16).padStart(2, '0');

const hslToHex = (hue: number, saturation: number, lightness: number): string => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue / 60;
  const secondary = chroma * (1 - Math.abs((section % 2) - 1));
  const [red, green, blue] =
    section < 1
      ? [chroma, secondary, 0]
      : section < 2
        ? [secondary, chroma, 0]
        : section < 3
          ? [0, chroma, secondary]
          : section < 4
            ? [0, secondary, chroma]
            : section < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const match = lightness - chroma / 2;

  return `#${channelToHex(red + match)}${channelToHex(green + match)}${channelToHex(blue + match)}`.toUpperCase();
};

const hexToSpectrumPosition = (
  value: string,
): { readonly hue: number; readonly lightness: number } => {
  const match = /^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i.exec(value);
  if (!match) return { hue: 0, lightness: 0.5 };

  const [red, green, blue] = match.slice(1).map((channel) =>
    Number.parseInt(channel, 16) / 255,
  );
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const difference = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  if (difference === 0) return { hue: 0, lightness };

  const hueSection =
    maximum === red
      ? ((green - blue) / difference) % 6
      : maximum === green
        ? (blue - red) / difference + 2
        : (red - green) / difference + 4;
  const hue = (hueSection * 60 + 360) % 360;
  return { hue: Math.min(hue, MAX_SPECTRUM_HUE), lightness };
};

const COLOR_SPECTRUM = Array.from(
  { length: SPECTRUM_ROWS },
  (_, rowIndex) => {
    const lightness = 1 - rowIndex / (SPECTRUM_ROWS - 1);
    return Array.from({ length: SPECTRUM_COLUMNS }, (_, columnIndex) =>
      hslToHex(
        (columnIndex / (SPECTRUM_COLUMNS - 1)) * MAX_SPECTRUM_HUE,
        1,
        lightness,
      ),
    );
  },
);

interface ColorSpectrumProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

const ColorSpectrum = ({ label, value, onChange }: ColorSpectrumProps) => {
  const theme = useAppTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const position = hexToSpectrumPosition(value);
  const markerColor = /^#[0-9A-F]{6}$/i.test(value)
    ? value
    : theme.colors.surface;
  const markerHorizontalRatio = Math.min(
    0.97,
    Math.max(0.03, position.hue / MAX_SPECTRUM_HUE),
  );
  const markerVerticalRatio = Math.min(
    0.97,
    Math.max(0.03, 1 - position.lightness),
  );
  const markerLeft: `${number}%` = `${Number(
    (markerHorizontalRatio * 100).toFixed(2),
  )}%`;
  const markerTop: `${number}%` = `${Number(
    (markerVerticalRatio * 100).toFixed(2),
  )}%`;

  const changeFromTouch = useCallback(
    (event: GestureResponderEvent) => {
      if (size.width === 0 || size.height === 0) return;
      const horizontalRatio = Math.min(
        1,
        Math.max(0, event.nativeEvent.locationX / size.width),
      );
      const verticalRatio = Math.min(
        1,
        Math.max(0, event.nativeEvent.locationY / size.height),
      );
      onChange(
        hslToHex(
          horizontalRatio * MAX_SPECTRUM_HUE,
          1,
          1 - verticalRatio,
        ),
      );
    },
    [onChange, size.height, size.width],
  );

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${label} color spectrum`}
      accessibilityHint="Move horizontally through the rainbow and vertically from light to dark."
      accessibilityValue={{ text: value.toUpperCase() }}
      onLayout={({ nativeEvent }) => setSize(nativeEvent.layout)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={changeFromTouch}
      onResponderMove={changeFromTouch}
      onResponderTerminationRequest={() => false}
      style={{
        height: 220,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.field,
      }}
    >
      <View
        accessibilityElementsHidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {COLOR_SPECTRUM.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flex: 1, flexDirection: 'row' }}>
            {row.map((color, columnIndex) => (
              <View
                key={`${rowIndex}-${columnIndex}`}
                style={{ flex: 1, backgroundColor: color }}
              />
            ))}
          </View>
        ))}
      </View>
      <View
        accessible={false}
        testID={`${label.toLowerCase().replaceAll(' ', '-')}-selection-marker`}
        style={{
          position: 'absolute',
          left: markerLeft,
          top: markerTop,
          width: 20,
          height: 20,
          marginLeft: -10,
          marginTop: -10,
          borderWidth: 3,
          borderColor: theme.colors.surface,
          borderRadius: theme.radii.pill,
          backgroundColor: markerColor,
          pointerEvents: 'none',
        }}
      />
    </View>
  );
};

interface HexColorPickerProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export const HexColorPicker = ({
  label,
  value,
  onChange,
}: HexColorPickerProps) => {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const selectedValue = value.toUpperCase();
  const previewColor = /^#[0-9A-F]{6}$/.test(selectedValue)
    ? selectedValue
    : theme.colors.surface;

  return (
    <>
      <FormField
        label={label}
        helper="Choose a color visually or enter a custom hex value."
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded: open }}
          onPress={() => {
            setDraftValue(value);
            setOpen(true);
          }}
          style={({ pressed }) => ({
            minHeight: theme.layout.minTouchTarget,
            paddingHorizontal: theme.spacing.sm,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.field,
            backgroundColor: theme.colors.surface,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View
            accessibilityLabel={`${label} preview`}
            style={{
              width: 28,
              height: 28,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: previewColor,
            }}
          />
          <AppText variant="label" style={{ flex: 1 }}>
            {selectedValue}
          </AppText>
          <AppText variant="caption" color="primary">
            Choose
          </AppText>
        </Pressable>
      </FormField>

      {open ? (
        <Dialog
          visible
          closeLabel={`Close ${label.toLowerCase()} picker`}
          onClose={() => setOpen(false)}
        >
          <View style={{ gap: theme.spacing.xxs }}>
            <AppText variant="section">Choose {label.toLowerCase()}</AppText>
            <AppText color="muted">
              Drag across the rainbow and move up or down to adjust intensity.
            </AppText>
          </View>
          <ColorSpectrum
            label={label}
            value={draftValue}
            onChange={setDraftValue}
          />
          <FormTextInput
            label={`Custom ${label.toLowerCase()}`}
            helper="Use a six-digit hex value for an exact color."
            value={draftValue}
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={setDraftValue}
          />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button
              label="Cancel"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => setOpen(false)}
            />
            <Button
              label="Done"
              style={{ flex: 1 }}
              onPress={() => {
                onChange(draftValue);
                setOpen(false);
              }}
            />
          </View>
        </Dialog>
      ) : null}
    </>
  );
};
