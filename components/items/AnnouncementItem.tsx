import React from 'react';
import { Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { Button } from '../ui/Buttons';
import { Announcement } from '@/types';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { setSelectedAnnouncement } from '@/stores/announcementStores';

export const AnnouncementItem: React.FC<Announcement> = ({ id, title, info, createdAt, createdBy, authorAlias }) => {
  const router = useRouter();

  const createObj = () => {
    return new Announcement({id, title, info, createdAt, createdBy, authorAlias});
  }

  return (
    <Button style={containerStyles.card} onPress={() => {
        setSelectedAnnouncement(createObj());
        router.push('/announcements/view-ann');
    }}>
      <View style={containerStyles.entryElements}>
        <Text style={textStyles.label2}>{title}</Text>
        <Text style={textStyles.detail}>{info}</Text>
      </View>
    </Button>
  );
};
export default AnnouncementItem;