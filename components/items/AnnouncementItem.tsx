import React from 'react';
import { Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { Button } from '../ui/Buttons';
import { AnnouncementEntryObject } from '@/types';
import DatabaseService from '../DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

export const AnnouncementItem: React.FC<AnnouncementEntryObject> = ({ id, title, info, photos }) => {
  const router = useRouter();
  const database = DatabaseService.getInstance();

  return (
    <Button style={containerStyles.entryContainer} onPress={() => 
        router.push({
            pathname: '/announcements/view-ann',
            params: { paramId:id, paramTitle:title, paramInfo:info, paramPhotos:photos },
          })
    }>
      <View style={containerStyles.entryElements}>
        <Text style={textStyles.catalogTitle}>{title}</Text>
        <Text style={textStyles.catalogDescription}>{info}</Text>
      </View>
    </Button>
  );
};
export default AnnouncementItem;