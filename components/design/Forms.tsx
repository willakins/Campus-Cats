import React, { useId } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '../../theme';
import { AppText } from './Typography';

interface FormFieldRenderProps {
  readonly inputId: string;
  readonly describedBy?: string;
}

interface FormFieldProps {
  readonly label: string;
  readonly required?: boolean;
  readonly helper?: string;
  readonly error?: string;
  readonly children: React.ReactNode | ((props: FormFieldRenderProps) => React.ReactNode);
}

export const FormField = ({ label, required = false, helper, error, children }: FormFieldProps) => {
  const theme = useAppTheme();
  const generatedId = useId().replaceAll(':', '');
  const inputId = `field-${generatedId}`;
  const describedBy = error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined;
  return (
    <View style={{ gap: theme.spacing.xxs }}>
      <AppText variant="label">{required ? `${label} *` : label}</AppText>
      {typeof children === 'function' ? children({ inputId, describedBy }) : children}
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

export const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
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
      <AppText variant="section">{title}</AppText>
      {children}
    </View>
  );
};
