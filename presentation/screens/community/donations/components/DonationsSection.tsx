import { cardListViewportStyle, cardListContentStyle } from '@/theme';
import React from 'react';
import { Linking, ScrollView, View } from 'react-native';

import { DonationPage } from '@/core/domain';
import { useAppTheme } from '@/theme';
import { ProgressiveImage } from '@/presentation/ui/ProgressiveImage';
import { AppText, Button, Card, EmptyState, FeedbackBanner } from '@/presentation/ui';
import { useFloatingTabBarContentInset } from '@/presentation/navigation/floatingTabBar';

export const DonationsSection = ({
  page,
  clubName,
  canManage = false,
  onManage,
}: {
  readonly page: DonationPage;
  readonly clubName: string;
  readonly canManage?: boolean;
  readonly onManage?: () => void;
}) => {
  const theme = useAppTheme();
  const floatingTabBarContentInset = useFloatingTabBarContentInset();

  if (!page.title.trim()) {
    return (
      <View
        testID="donation-page-empty"
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <EmptyState
          title={
            canManage
              ? 'Your members cannot donate yet'
              : `${clubName} has not set up donations`
          }
          message={
            canManage
              ? 'Set up your club donation page so members have a way to contribute.'
              : 'Please message the club President to ask them to set this up.'
          }
          actionLabel={canManage ? 'Set up donations' : undefined}
          onAction={canManage ? onManage : undefined}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[{ flex: 1 }, cardListViewportStyle(theme)]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        ...cardListContentStyle(theme),
        flexGrow: 1,
        justifyContent: 'center',
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xl + floatingTabBarContentInset,
      }}
      testID="donation-page-content"
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
      {canManage && onManage ? (
        <Button
          testID="donation-page-manage-action"
          label="Edit donation page"
          icon="create-outline"
          variant="secondary"
          fullWidth
          onPress={onManage}
        />
      ) : null}
    </ScrollView>
  );
};
