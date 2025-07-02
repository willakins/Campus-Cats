import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { setSelectedAnnouncement } from '@/stores/announcementStores';
import { containerStyles, textStyles } from '@/styles';
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
    <Pressable
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
    </Pressable>
  );
};
export default AnnouncementItem;
