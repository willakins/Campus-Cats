import React, { useId, useState } from 'react';
import {
  Pressable,
  StyleProp,
  TextInput,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/theme';
import { Card } from './Layout';
import { AppText } from './Typography';

interface SearchFieldProps {
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly onFocus?: () => void;
  readonly accessibilityLabel: string;
  readonly placeholder: string;
  readonly clearAccessibilityLabel?: string;
}

export const SearchField = ({
  value,
  onChangeText,
  onFocus,
  accessibilityLabel,
  placeholder,
  clearAccessibilityLabel,
}: SearchFieldProps) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        minHeight: theme.layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? theme.colors.primary : theme.colors.border,
        borderRadius: theme.radii.field,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Ionicons name="search" size={20} color={theme.colors.textMuted} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.primary}
        style={[
          theme.typography.body,
          {
            flex: 1,
            minWidth: 0,
            height: theme.layout.minTouchTarget,
            paddingVertical: 0,
            color: theme.colors.text,
            textAlignVertical: 'center',
            outlineWidth: 0,
          },
        ]}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            clearAccessibilityLabel ??
            `Clear ${accessibilityLabel.toLocaleLowerCase()}`
          }
          hitSlop={8}
          onPress={() => onChangeText('')}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons
            name="close-circle"
            size={20}
            color={theme.colors.textMuted}
          />
        </Pressable>
      ) : null}
    </View>
  );
};

interface FormFieldRenderProps {
  readonly inputId: string;
  readonly describedBy?: string;
}

interface FormFieldProps {
  readonly label: string;
  readonly hideLabel?: boolean;
  readonly onLabelPress?: () => void;
  readonly required?: boolean;
  readonly helper?: string;
  readonly error?: string;
  readonly style?: StyleProp<ViewStyle>;
  readonly children:
    React.ReactNode | ((props: FormFieldRenderProps) => React.ReactNode);
}

const RequiredPill = () => {
  const theme = useAppTheme();
  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: theme.spacing.xxs,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.primarySurface,
      }}
    >
      <AppText variant="caption" color="primary">
        Required
      </AppText>
    </View>
  );
};

export const FormField = ({
  label,
  hideLabel = false,
  onLabelPress,
  required = false,
  helper,
  error,
  style,
  children,
}: FormFieldProps) => {
  const theme = useAppTheme();
  const generatedId = useId().replaceAll(':', '');
  const inputId = `field-${generatedId}`;
  const describedBy = error
    ? `${inputId}-error`
    : helper
      ? `${inputId}-helper`
      : undefined;
  const labelContent = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
      }}
    >
      <AppText variant="label">{label}</AppText>
      {required ? <RequiredPill /> : null}
    </View>
  );
  return (
    <View style={[{ gap: theme.spacing.xxs }, style]}>
      {hideLabel ? null : onLabelPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}${required ? ', required' : ''}`}
          hitSlop={8}
          onPress={onLabelPress}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          {labelContent}
        </Pressable>
      ) : (
        labelContent
      )}
      {typeof children === 'function'
        ? children({ inputId, describedBy })
        : children}
      {error ? (
        <AppText
          nativeID={`${inputId}-error`}
          color="danger"
          variant="caption"
          accessibilityLiveRegion="polite"
        >
          {error}
        </AppText>
      ) : helper ? (
        <AppText nativeID={`${inputId}-helper`} color="muted" variant="caption">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
};

export const FormSection = ({
  title,
  required = false,
  action,
  children,
  onLayout,
  testID,
}: {
  title: string;
  required?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
  onLayout?: ViewProps['onLayout'];
  testID?: string;
}) => {
  const theme = useAppTheme();
  return (
    <Card
      testID={testID}
      onLayout={onLayout}
      clipsContent={false}
      elevated={false}
      style={{
        gap: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <View
        style={{
          minHeight: action ? theme.layout.minTouchTarget : undefined,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.sm,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}
        >
          <AppText variant="section">{title}</AppText>
          {required ? <RequiredPill /> : null}
        </View>
        {action}
      </View>
      {children}
    </Card>
  );
};
