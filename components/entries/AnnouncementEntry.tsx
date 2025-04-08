import React, { useEffect, useState } from 'react';
import { Text, Image, View } from 'react-native';

import { AnnouncementEntryObject } from '@/types';
import DatabaseService from '../../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

export const AnnouncementEntry: React.FC<AnnouncementEntryObject> = ({ id, title, info, createdAt, createdBy }) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const database = DatabaseService.getInstance();  
  
  useEffect(() => {
    database.fetchAnnouncementImages(id, setPhotos);
  }, []);

  return (
    <View style={containerStyles.card}>
      <Text style={textStyles.label}>{title}</Text>
      <Text style={textStyles.detail}>{info}</Text>

      {photos.length > 0 && <Text style={textStyles.label}>Photos</Text>}
      {photos.map((url, index) => (
        <Image key={index} source={{ uri: url }} style={containerStyles.imageMain} />
      ))}

      <View style={containerStyles.footer}>
        <Text style={textStyles.footerText}>Author: {createdBy}</Text>
        <Text style={textStyles.footerText}>Announced At: {createdAt}</Text>
      </View>
    </View>
  );
};