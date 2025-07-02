import React from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { useRouter } from 'expo-router';

import { BackButton, Button } from '@/components';
import { SightingEntry } from '@/components';
import { useAuth } from '@/providers';
import { getSelectedSighting } from '@/stores/sightingStores';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const SightingScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const isAuthorized =
    user.role === 1 ||
    user.role === 2 ||
    user.id === getSelectedSighting().createdBy.id;

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <BackButton />
      <ScrollView contentContainerStyle={containerStyles.scrollViewPadded}>
        <SightingEntry />
      </ScrollView>
      {isAuthorized && (
        <Button onPress={() => router.push('./edit-sighting')}>Edit</Button>
      )}
    </SafeAreaView>
  );
};
export default SightingScreen;
