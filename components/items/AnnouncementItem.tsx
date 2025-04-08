import React from 'react';
import { Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { Button } from '../ui/Buttons';
import { AnnouncementEntryObject } from '@/types';
import DatabaseService from '../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

export const AnnouncementItem: React.FC<AnnouncementEntryObject> = ({ id, title, info, createdAt, createdBy }) => {
  const router = useRouter();
  const database = DatabaseService.getInstance();

  return (
    <Button style={containerStyles.card} onPress={() => 
        router.push({
            pathname: '/announcements/view-ann',
            params: { id:id, title:title, info:info, createdAt:createdAt, createdBy:createdBy },
          })
    }>
      <View style={containerStyles.entryElements}>
        <Text style={textStyles.label2}>{title}</Text>
        <Text style={textStyles.detail}>{info}</Text>
      </View>
    </Button>
  );
};
export default AnnouncementItem;