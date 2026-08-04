import React from 'react';
import { View } from 'react-native';

import { useAppTheme } from '../../theme';
import { AppHeader, Button, FeedbackBanner, FormSection, Screen } from '../design';

interface FormScreenProps {
  readonly title: string;
  readonly eyebrow: string;
  readonly saveLabel: string;
  readonly savingLabel: string;
  readonly busy: boolean;
  readonly error?: string;
  readonly onBack: () => void;
  readonly onSave: () => void;
  readonly onDelete?: () => void;
  readonly deleteLabel?: string;
  readonly children: React.ReactNode;
}

export const FormScreen = ({
  title,
  eyebrow,
  saveLabel,
  savingLabel,
  busy,
  error,
  onBack,
  onSave,
  onDelete,
  deleteLabel,
  children,
}: FormScreenProps) => {
  const theme = useAppTheme();
  return (
    <Screen
      scroll
      keyboardAware
      footer={(
        <Button
          label={saveLabel}
          fullWidth
          loading={busy}
          loadingLabel={savingLabel}
          onPress={onSave}
        />
      )}
    >
      <AppHeader title={title} eyebrow={eyebrow} onBack={onBack} />
      <View style={{ gap: theme.spacing.lg }}>
        {error ? <FeedbackBanner message={error} tone="danger" /> : null}
        {children}
        {onDelete && deleteLabel ? (
          <FormSection title="Danger zone">
            <Button
              label={deleteLabel}
              variant="danger"
              fullWidth
              disabled={busy}
              onPress={onDelete}
            />
          </FormSection>
        ) : null}
      </View>
    </Screen>
  );
};
