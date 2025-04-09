import React, { useEffect, useState } from 'react';
import { Text, Image, View } from 'react-native';

import { Announcement } from '@/types';
import DatabaseService from '../../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { getSelectedAnnouncement } from '@/stores/announcementStores';

export const AnnouncementEntry: React.FC = () => {
  const [photos, setPhotos] = useState<string[]>([]);
  const database = DatabaseService.getInstance();  
  const ann = getSelectedAnnouncement();
  
  useEffect(() => {
    database.fetchAnnouncementImages(ann.id, setPhotos);
  }, []);

  return (
    <View style={containerStyles.card}>
      <Text style={textStyles.label}>{ann.title}</Text>
      <Text style={textStyles.detail}>{ann.info}</Text>

      {photos.length > 0 && <Text style={textStyles.label}>Photos</Text>}
      {photos.map((url, index) => (
        <Image key={index} source={{ uri: url }} style={containerStyles.imageMain} />
      ))}

      <View style={containerStyles.footer}>
        <Text style={textStyles.footerText}>Author: {ann.authorAlias ? ann.authorAlias:ann.createdBy.id}</Text>
        <Text style={textStyles.footerText}>{Announcement.getDateString(ann)}</Text>
      </View>
    </View>
  );
};