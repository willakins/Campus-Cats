import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { AnnouncementItem, Button, LoadingIndicator } from '@/components';
import { useAuth } from '@/providers';
import DatabaseService from '@/services/DatabaseService';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { Announcement } from '@/types';

const Announcements = () => {
  const { user, loading } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const database = DatabaseService.getInstance();
  const [anns, setAnns] = useState<Announcement[]>([]);

  useFocusEffect(
    useCallback(() => {
      void database.fetchAnnouncementData(setAnns);
      // NOTE: database is a singleton class provided by DatabaseService and
      // will never change; it does not need to be a dependency.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Text style={textStyles.pageTitle}>Announcements</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {anns.map((ann) => (
          <AnnouncementItem
            key={ann.id}
            id={ann.id}
            title={ann.title}
            info={ann.info}
            createdAt={ann.createdAt}
            createdBy={ann.createdBy}
            authorAlias={ann.authorAlias}
          />
        ))}
      </ScrollView>
      {isAdmin ? (
        <Button
          style={buttonStyles.bigButton}
          onPress={() => router.push('/announcements/create-ann')}
        >
          <Text style={textStyles.bigButtonText}> Create Announcement</Text>
        </Button>
      ) : null}
    </SafeAreaView>
  );
};
export default Announcements;
