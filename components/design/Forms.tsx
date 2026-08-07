import React, { useId, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../theme';
import { AppText } from './Typography';

interface SearchFieldProps {
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly accessibilityLabel: string;
  readonly placeholder: string;
}

export const SearchField = ({
  value,
  onChangeText,
  accessibilityLabel,
  placeholder,
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.primary}
        style={[
          theme.typography.body,
          {
            flex: 1,
            minWidth: 0,
            height: theme.layout.minTouchTarget,
            color: theme.colors.text,
            outlineWidth: 0,
          },
        ]}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Clear ${accessibilityLabel.toLocaleLowerCase()}`}
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
  readonly required?: boolean;
  readonly helper?: string;
  readonly error?: string;
  readonly children:
    React.ReactNode | ((props: FormFieldRenderProps) => React.ReactNode);
}

export const FormField = ({
  label,
  required = false,
  helper,
  error,
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
  return (
    <View style={{ gap: theme.spacing.xxs }}>
      <AppText variant="label">{required ? `${label} *` : label}</AppText>
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
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const theme = useAppTheme();
  return (
    <View
      style={{
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radii.card,
        backgroundColor: theme.colors.surface,
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
        <AppText variant="section" style={{ flex: 1 }}>
          {title}
        </AppText>
        {action}
      </View>
      {children}
    </View>
  );
};
