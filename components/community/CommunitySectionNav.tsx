import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../theme';
import { AppText, Card } from '../design';

export type CommunitySection =
  | 'announcements'
  | 'events'
  | 'surveys'
  | 'votes'
  | 'chat';

const sections: readonly {
  readonly value: CommunitySection;
  readonly label: string;
  readonly description: string;
  readonly icon: React.ComponentProps<typeof Ionicons>['name'];
  readonly color: 'primary' | 'coral' | 'teal' | 'violet' | 'gold';
}[] = [
  {
    value: 'announcements',
    label: 'Announcements',
    description: 'Club news and volunteer updates',
    icon: 'megaphone-outline',
    color: 'primary',
  },
  {
    value: 'chat',
    label: 'Chat',
    description: 'Conversations with the community',
    icon: 'chatbubbles-outline',
    color: 'coral',
  },
  {
    value: 'events',
    label: 'Events',
    description: 'Upcoming gatherings and workdays',
    icon: 'calendar-outline',
    color: 'teal',
  },
  {
    value: 'surveys',
    label: 'Surveys',
    description: 'Share feedback with the club',
    icon: 'clipboard-outline',
    color: 'violet',
  },
  {
    value: 'votes',
    label: 'Votes',
    description: 'Contests and club elections',
    icon: 'checkmark-done-circle-outline',
    color: 'gold',
  },
];

export const CommunitySectionGrid = ({
  onChange,
}: {
  readonly onChange: (value: CommunitySection) => void;
}) => {
  const theme = useAppTheme();
  const palettes = {
    primary: [theme.colors.primarySurface, theme.colors.primary],
    coral: [theme.colors.coralSurface, theme.colors.coral],
    teal: [theme.colors.tealSurface, theme.colors.teal],
    violet: [theme.colors.violetSurface, theme.colors.violet],
    gold: [theme.colors.goldSurface, theme.colors.gold],
  } as const;

  return (
    <ScrollView
      accessibilityLabel="Community destinations"
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
      }}
    >
      {sections.map((section) => {
        const [backgroundColor, foreground] = palettes[section.color];
        return (
          <Card
            key={section.value}
            accessibilityLabel={`Open ${section.label}`}
            onPress={() => onChange(section.value)}
            style={{
              flexBasis: '46%',
              flexGrow: 1,
              minWidth: 132,
              maxWidth: 260,
              aspectRatio: 1,
              justifyContent: 'space-between',
              backgroundColor,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.radii.pill,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Ionicons name={section.icon} size={28} color={foreground} />
            </View>
            <View style={{ gap: theme.spacing.xxs }}>
              <AppText variant="section" style={{ color: foreground }}>
                {section.label}
              </AppText>
              <AppText color="muted">{section.description}</AppText>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
};

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
