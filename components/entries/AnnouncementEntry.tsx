import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import DatabaseService from '../../services/DatabaseService';

import { getSelectedAnnouncement } from '@/stores/announcementStores';
import { containerStyles, textStyles } from '@/styles';
import { Announcement } from '@/types';

export const AnnouncementEntry: React.FC = () => {
  const [photos, setPhotos] = useState<string[]>([]);
  const database = DatabaseService.getInstance();
  const ann = getSelectedAnnouncement();

  useEffect(() => {
    database.fetchAnnouncementImages(ann.id, setPhotos);
    // NOTE: database is a singleton class provided by DatabaseService and
    // will never change; it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ann.id]);

  return (
    <View style={containerStyles.card}>
      <Text style={textStyles.cardTitle}>{ann.title}</Text>
      <Text style={textStyles.detail}>{ann.info}</Text>

      {photos.length > 0 && <Text style={textStyles.label}>Photos</Text>}
      {photos.map((url, index) => (
        <Image
          key={index}
          source={{ uri: url }}
          style={containerStyles.imageMain}
        />
      ))}

      <View style={containerStyles.footer}>
        <Text style={textStyles.footerText}>
          Author: {ann.authorAlias ? ann.authorAlias : ann.createdBy.id}
        </Text>
        <Text style={textStyles.footerText}>
          {Announcement.getDateString(ann)}
        </Text>
      </View>
    </View>
  );
};
