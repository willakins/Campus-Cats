import React from 'react';
import { Pressable, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText, FormSection } from '@/components/design';
import { useAppTheme } from '@/theme';

interface ParticipationAnnouncementOptionProps {
  readonly checked: boolean;
  readonly subject: 'survey' | 'vote';
  readonly onChange: (checked: boolean) => void;
}

export const ParticipationAnnouncementOption = ({
  checked,
  subject,
  onChange,
}: ParticipationAnnouncementOptionProps) => {
  const theme = useAppTheme();
  return (
    <FormSection title="Announcement">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Create an announcement for this ${subject}`}
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        style={({ pressed }) => ({
          minHeight: theme.layout.minTouchTarget,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View
          style={{
            width: 24,
            height: 24,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: checked ? theme.colors.primary : theme.colors.border,
            borderRadius: theme.radii.field / 2,
            backgroundColor: checked
              ? theme.colors.primary
              : theme.colors.surface,
          }}
        >
          {checked ? (
            <Ionicons name="checkmark" size={18} color={theme.colors.onPrimary} />
          ) : null}
        </View>
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText variant="label">Create an announcement</AppText>
          <AppText variant="caption" color="muted">
            Tell members that this {subject} is ready for participation.
          </AppText>
        </View>
      </Pressable>
    </FormSection>
  );
};
