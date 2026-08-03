import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { AnnouncementItem, Button, Errorbar } from '@/components';
import { appModules } from '@/composition/appModules';
import { Announcement } from '@/core/domain';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const Announcements = () => {
  const { user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const [announcements, setAnnouncements] = useState<readonly Announcement[]>([]);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      void appModules.announcements.list().then((result) => {
        if (result.ok) setAnnouncements(result.value);
        else setError(result.error.message);
      });
    }, []),
  );

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Errorbar error={error} onDismiss={() => setError('')} />
      <Text style={textStyles.pageTitle}>Announcements</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {announcements.map((announcement) => (
          <AnnouncementItem key={announcement.id} {...announcement} />
        ))}
      </ScrollView>
      {isAdmin ? (
        <Button
          style={buttonStyles.bigButton}
          onPress={() => router.push('/announcements/create-ann')}
        >
          <Text style={textStyles.bigButtonText}>Create Announcement</Text>
        </Button>
      ) : null}
    </SafeAreaView>
  );
};

export default Announcements;
