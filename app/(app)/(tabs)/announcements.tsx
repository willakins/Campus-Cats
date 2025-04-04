import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

import { AnnouncementItem, Button, LoadingIndicator } from '@/components';
import { useAuth } from '@/providers';
import { router, useFocusEffect } from 'expo-router';
import DatabaseService from '@/components/services/DatabaseService';
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
    <SafeAreaView style={containerStyles.container}>
      <Text style={textStyles.title}>Announcements</Text>
      {isAdmin ? <Button style={buttonStyles.editButton} onPress={() => router.push('/announcements/create-ann')}>
        <Text style ={textStyles.editText}> Create Announcement</Text>
      </Button> : null}
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
    </SafeAreaView>
  );
};
export default Announcements;