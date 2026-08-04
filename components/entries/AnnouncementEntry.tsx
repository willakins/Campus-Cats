import React from 'react';
import { View } from 'react-native';

import { Announcement } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAppTheme } from '@/theme';
import { AppText } from '../design';
import { DetailHero, FieldNoteSection, MetadataRow } from '../details';

interface AnnouncementEntryProps {
  readonly announcement: Announcement;
  readonly media: readonly StoredMediaAsset[];
}

export const AnnouncementEntry: React.FC<AnnouncementEntryProps> = ({ announcement, media }) => {
  const theme = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      {media.length > 0 ? <DetailHero title={announcement.title} media={media} /> : null}
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="pageTitle">{announcement.title}</AppText>
        <AppText color="muted">
          {announcement.createdAt.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </AppText>
      </View>
      <FieldNoteSection title="Update" icon="megaphone-outline">
        <AppText>{announcement.info}</AppText>
      </FieldNoteSection>
      <FieldNoteSection title="Attribution" icon="person-outline">
        <MetadataRow
          label="Author"
          value={announcement.authorAlias || announcement.createdBy.id}
        />
      </FieldNoteSection>
    </View>
  );
};
