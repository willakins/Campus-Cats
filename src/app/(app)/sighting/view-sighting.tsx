import React from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '@/components';
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
      <Button
        style={buttonStyles.smallButtonTopLeft}
        onPress={() => router.push('/(app)/(tabs)')}
      >
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
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
