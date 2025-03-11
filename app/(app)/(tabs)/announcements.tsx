import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

import { AnnouncementItem, Button, LoadingIndicator } from '@/components';
import { useAuth } from '@/providers';
import { router } from 'expo-router';
import DatabaseService from '@/components/DatabaseService';
import { AnnouncementEntryObject } from '@/types';

const Announcements = () => {
  const { user, loading } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const database = DatabaseService.getInstance();
  const [anns, setAnns] = useState<AnnouncementEntryObject[]>([]);

  if (loading) {
    return <LoadingIndicator />;
  }

  useEffect(() => {
    database.fetchAnnouncementData(setAnns);
  }, []);

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
                photos={ann.photos}
              />
            ))}
          </ScrollView>
        </SafeAreaView>
  );
};
export default Announcements;