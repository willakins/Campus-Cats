import React, { useEffect, useState } from 'react';
import { Text, Image, ScrollView } from 'react-native';

import { AnnouncementEntryObject } from '@/types';
import DatabaseService from '../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

export const AnnouncementEntry: React.FC<AnnouncementEntryObject> = ({ id, title, info, createdAt, createdBy }) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const database = DatabaseService.getInstance();  

  useEffect(() => {
    database.fetchAnnouncementImages(id, setImageUrls);
  }, []);

  return (
    <ScrollView contentContainerStyle={containerStyles.scrollView}>
      <Text style={textStyles.announcementTitle}>{title}</Text>
      <Text style={textStyles.subHeading2}>Author: {createdBy}</Text>
      <Text style={textStyles.subHeading2}>Announced At: {createdAt}</Text>
      <Text style={textStyles.announcementDescription}>{info}</Text>
      {imageUrls.length > 0 ? <Text style={textStyles.headline2}> Photos</Text> : null}
      {imageUrls ? (imageUrls.map((url, index) => (
        <Image key={index} source={{ uri: url }} style={containerStyles.headlineImage} />))) : <Text>Loading images...</Text>}
    </ScrollView>
  );
};