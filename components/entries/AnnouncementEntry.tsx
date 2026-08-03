import React from 'react';
import { Image, Text, View } from 'react-native';

import { Announcement } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { containerStyles, textStyles } from '@/styles';

interface AnnouncementEntryProps {
  readonly announcement: Announcement;
  readonly media: readonly StoredMediaAsset[];
}

export const AnnouncementEntry: React.FC<AnnouncementEntryProps> = ({
  announcement,
  media,
}) => (
  <View style={containerStyles.card}>
    <Text style={textStyles.cardTitle}>{announcement.title}</Text>
    <Text style={textStyles.detail}>{announcement.info}</Text>

    {media.length > 0 ? <Text style={textStyles.label}>Photos</Text> : null}
    {media.map((asset) => (
      <Image
        key={asset.id}
        source={{ uri: asset.url }}
        style={containerStyles.imageMain}
      />
    ))}

    <View style={containerStyles.footer}>
      <Text style={textStyles.footerText}>
        Author: {announcement.authorAlias || announcement.createdBy.id}
      </Text>
      <Text style={textStyles.footerText}>
        Posted on{' '}
        {announcement.createdAt.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </Text>
    </View>
  </View>
);
