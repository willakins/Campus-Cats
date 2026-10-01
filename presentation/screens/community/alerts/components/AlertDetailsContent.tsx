import React from 'react';
import { View } from 'react-native';

import { Alert } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAppTheme } from '@/theme';
import { AppText } from '@/presentation/ui';
import { DetailHero, FieldNoteSection, MetadataRow } from '@/presentation/patterns/details';

interface AlertDetailsContentProps {
  readonly alert: Alert;
  readonly media: readonly StoredMediaAsset[];
}

export const AlertDetailsContent: React.FC<AlertDetailsContentProps> = ({ alert, media }) => {
  const theme = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      {media.length > 0 ? <DetailHero title={alert.title} media={media} /> : null}
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="pageTitle">{alert.title}</AppText>
        <AppText color="muted">
          {alert.createdAt.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </AppText>
      </View>
      <FieldNoteSection title="Update" icon="megaphone-outline">
        <AppText>{alert.info}</AppText>
      </FieldNoteSection>
      <FieldNoteSection title="Attribution" icon="person-outline">
        <MetadataRow
          label="Author"
          value={alert.authorAlias || alert.createdBy.id}
        />
      </FieldNoteSection>
    </View>
  );
};
