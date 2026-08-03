import React from 'react';
import { Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { Announcement } from '@/core/domain';
import { containerStyles, textStyles } from '@/styles';

import { Button } from '../ui/Buttons';

export const AnnouncementItem: React.FC<Announcement> = (announcement) => {
  const router = useRouter();

  return (
    <Button
      style={containerStyles.card}
      onPress={() =>
        router.push({
          pathname: '/announcements/view-ann',
          params: { id: announcement.id },
        })
      }
    >
      <View style={containerStyles.verticalCard}>
        <Text style={textStyles.listTitle}>{announcement.title}</Text>
        <Text style={textStyles.detail}>{announcement.info}</Text>
      </View>
    </Button>
  );
};

export default AnnouncementItem;
