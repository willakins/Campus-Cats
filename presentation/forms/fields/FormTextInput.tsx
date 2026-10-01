import { useState } from 'react';
import {
  StyleProp,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';

import { FormField } from '@/presentation/ui';
import { useAppTheme } from '@/theme';

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
  const { fontScale } = useWindowDimensions();
  const [focused, setFocused] = useState(false);
  const singleLineHeight =
    (theme.typography.body.lineHeight ??
      theme.typography.body.fontSize ??
      theme.layout.minTouchTarget) * Math.min(fontScale, 2);
  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.border;
  const input = (
    inputProps: TextInputProps,
    inputStyle: TextInputProps['style'],
    borderWidth: number,
  ) => (
    <TextInput
      accessibilityLabel={label}
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
      {...inputProps}
      style={[
        theme.typography.body,
        {
          paddingHorizontal: theme.spacing.sm,
          borderWidth,
          borderColor,
          borderRadius: theme.radii.field,
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
        },
        inputStyle,
        style,
      ]}
      {...props}
    />
  );
  return (
    <FormField
      label={label}
      hideLabel={hideLabel}
      required={required}
      helper={helper}
      error={error}
      style={containerStyle}
    >
      {({ inputId, describedBy }) => {
        const accessibilityProps = {
          accessibilityHint: describedBy,
          nativeID: inputId,
          maxFontSizeMultiplier: 2,
        };
        if (multiline) {
          return input(
            { ...accessibilityProps, multiline: true },
            {
              minHeight: 112,
              paddingVertical: theme.spacing.xs,
              textAlignVertical: 'top',
            },
            focused ? 2 : 1,
          );
        }
        return (
          <View
            style={{
              minHeight: theme.layout.minTouchTarget,
              justifyContent: 'center',
              borderWidth: focused ? 2 : 1,
              borderColor,
              borderRadius: theme.radii.field,
              backgroundColor: theme.colors.surface,
            }}
          >
            {input(
              accessibilityProps,
              {
                height: singleLineHeight,
                paddingVertical: 0,
                includeFontPadding: false,
                borderWidth: 0,
                textAlignVertical: 'center',
                outlineWidth: 0,
                outlineStyle: 'solid',
                outlineColor: 'transparent',
              },
              0,
            )}
          </View>
        );
      }}
    </FormField>
  );
};
