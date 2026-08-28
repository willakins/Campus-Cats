import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { APP_HEX_COLOR_PALETTE, useAppTheme } from '../../theme';
import { AppText } from '../design';
import { focusRingStyle } from '../design/focus';
import { FormTextInput } from './FormControls';

interface HexColorSwatchProps {
  readonly color: string;
  readonly fieldLabel: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}

const HexColorSwatch = ({
  color,
  fieldLabel,
  selected,
  onPress,
}: HexColorSwatchProps) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Set ${fieldLabel} to ${color}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        {
          width: theme.layout.minTouchTarget,
          height: theme.layout.minTouchTarget,
          borderRadius: theme.radii.pill,
          borderWidth: selected ? 3 : 1,
          borderColor: selected ? theme.colors.text : theme.colors.border,
          backgroundColor: color,
          opacity: pressed ? 0.75 : 1,
        },
        focusRingStyle(focused, theme.colors.info),
      ]}
    />
  );
};

interface HexColorPickerProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly palette?: readonly string[];
}

export const HexColorPicker = ({
  label,
  value,
  onChange,
  palette = APP_HEX_COLOR_PALETTE,
}: HexColorPickerProps) => {
  const theme = useAppTheme();
  const selectedValue = value.toUpperCase();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <FormTextInput
        label={label}
        helper="Enter a six-digit hex value or choose from the palette."
        value={value}
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={onChange}
      />
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="caption" color="muted">
          Hex palette
        </AppText>
        <View
          accessibilityLabel={`${label} hex palette`}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.xs,
          }}
        >
          {palette.map((color) => (
            <HexColorSwatch
              key={color}
              color={color}
              fieldLabel={label}
              selected={selectedValue === color.toUpperCase()}
              onPress={() => onChange(color)}
            />
          ))}
        </View>
      </View>
    </View>
  );
};
