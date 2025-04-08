import React from 'react';
import { Text, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components';
import { useAuth } from '@/providers';
import { Ionicons } from '@expo/vector-icons';
import { buttonStyles, textStyles, containerStyles } from '@/styles';
import { getSelectedSighting } from '@/stores/sightingStores';
import { SightingEntry } from '@/components';

const SightingScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const isAuthorized = user.role === 1 || user.role === 2 || user.id === getSelectedSighting().createdBy.id;

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/(app)/(tabs)')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <ScrollView contentContainerStyle={[containerStyles.scrollView, {paddingTop:'10%'}]}>
        <SightingEntry/>
      </ScrollView>
      {isAuthorized && (
        <Button style={buttonStyles.button2} onPress={() => router.push('./edit-sighting')}>
          <Text style={textStyles.bigButtonText}>Edit</Text>
        </Button>
      )}
    </SafeAreaView>
  );
};
export default SightingScreen;