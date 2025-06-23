import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '../ui/Buttons';
import { useRouter } from 'expo-router';

import { setSelectedAnnouncement } from '@/stores/announcementStores';
import {
  buttonStyles,
  containerStyles,
  globalStyles,
  textStyles,
} from '@/styles';
import { Announcement } from '@/types';

export const AnnouncementItem: React.FC<Announcement> = ({
  id,
  title,
  info,
  createdAt,
  createdBy,
  authorAlias,
}) => {
  const router = useRouter();

  const createObj = () => {
    return new Announcement({
      id,
      title,
      info,
      createdAt,
      createdBy,
      authorAlias,
    });
  };

  return (
    <Button
      style={containerStyles.card}
      onPress={() => {
        setSelectedAnnouncement(createObj());
        router.push('/announcements/view-ann');
      }}
    >
      <View style={containerStyles.verticalCard}>
        <Text style={textStyles.listTitle}>{title}</Text>
        <Text style={textStyles.detail}>{info}</Text>
      </View>
    </Button>
  );
};
export default AnnouncementItem;
