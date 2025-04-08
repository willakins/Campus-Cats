import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

import { AnnouncementItem, Button, LoadingIndicator } from '@/components';
import { useAuth } from '@/providers';
import { router, useFocusEffect } from 'expo-router';
import DatabaseService from '@/services/DatabaseService';
import { AnnouncementEntryObject } from '@/types';

const Announcements = () => {
  const { user, loading } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const database = DatabaseService.getInstance();
  const [anns, setAnns] = useState<AnnouncementEntryObject[]>([]);

  if (loading) {
    return <LoadingIndicator />;
  }

  useFocusEffect(
    useCallback(() => {
      database.fetchAnnouncementData(setAnns);
    }, [])
  );

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Text style={textStyles.title}>Announcements</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {anns.map((ann) => (
          <AnnouncementItem
            key={ann.id}
            id={ann.id}
            title={ann.title}
            info={ann.info}
            createdAt={ann.createdAt}
            createdBy={ann.createdBy}
          />
        ))}
      </ScrollView>
      {isAdmin ? <Button style={buttonStyles.button2} onPress={() => router.push('/announcements/create-ann')}>
        <Text style ={textStyles.bigButtonText}> Create Announcement</Text>
      </Button> : null}
    </SafeAreaView>
  );
};
export default Announcements;