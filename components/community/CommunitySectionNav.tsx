import React from 'react';
import { Pressable, ScrollView } from 'react-native';

import { useAppTheme } from '../../theme';
import { AppText } from '../design';

export type CommunitySection =
  | 'announcements'
  | 'events'
  | 'surveys'
  | 'chat';

const sections: readonly {
  readonly value: CommunitySection;
  readonly label: string;
}[] = [
  { value: 'announcements', label: 'Announcements' },
  { value: 'events', label: 'Events' },
  { value: 'surveys', label: 'Surveys' },
  { value: 'chat', label: 'Chat' },
];

export const CommunitySectionNav = ({
  value,
  onChange,
}: {
  readonly value: CommunitySection;
  readonly onChange: (value: CommunitySection) => void;
}) => {
  const theme = useAppTheme();
  return (
    <ScrollView
      horizontal
      accessibilityLabel="Community sections"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing.xs, paddingBottom: theme.spacing.md }}
    >
      {sections.map((section) => {
        const selected = value === section.value;
        return (
          <Pressable
            key={section.value}
            accessibilityRole="tab"
            accessibilityLabel={section.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(section.value)}
            style={({ pressed }) => ({
              minHeight: theme.layout.minTouchTarget,
              justifyContent: 'center',
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              borderColor: selected ? theme.colors.primary : theme.colors.border,
              backgroundColor: selected
                ? theme.colors.primary
                : theme.colors.surface,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <AppText
              variant="label"
              style={{
                color: selected ? theme.colors.onPrimary : theme.colors.text,
              }}
            >
              {section.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};
