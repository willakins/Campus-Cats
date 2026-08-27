import React from 'react';
import { Linking, ScrollView, View } from 'react-native';

import { DonationPage as DonationPageContent } from '@/core/domain';
import { useAppTheme } from '@/theme';
import { ProgressiveImage } from '../ui/ProgressiveImage';
import { AppText, Button, Card, EmptyState, FeedbackBanner } from '../design';

export const DonationPage = ({
  page,
  clubName,
}: {
  readonly page: DonationPageContent;
  readonly clubName: string;
}) => {
  const theme = useAppTheme();

  if (!page.title.trim()) {
    return (
      <EmptyState
        title={`${clubName} has not set up donations`}
        message="Please message the club President to ask them to set this up."
      />
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
      }}
    >
      {page.images[0] ? (
        <ProgressiveImage
          uri={page.images[0].url}
          accessibilityLabel="Donation photo"
          style={{
            width: '100%',
            aspectRatio: 4 / 3,
            borderRadius: theme.radii.card,
          }}
          imageStyle={{ borderRadius: theme.radii.card }}
        />
      ) : null}
      <Card accent={theme.colors.coral}>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="section">{page.title}</AppText>
          <AppText>{page.description}</AppText>
        </View>
      </Card>
      {page.method === 'external' ? (
        <Button
          label="Donate on external website"
          icon="open-outline"
          fullWidth
          onPress={() => void Linking.openURL(page.externalUrl)}
        />
      ) : (
        <FeedbackBanner
          tone="info"
          message="Direct donations are coming soon. The club's donation page is ready while in-app payments are being built."
        />
      )}
    </ScrollView>
  );
};
