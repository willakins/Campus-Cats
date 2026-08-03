import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button, Errorbar, StationItem } from '@/components';
import { appModules } from '@/composition/appModules';
import { Station } from '@/core/domain';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const Stations = () => {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user.role === 1 || user.role === 2;
  const [stations, setStations] = useState<readonly Station[]>([]);
  const [filter, setFilter] = useState<'All' | 'Stocked' | 'Unstocked'>('All');
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!isAdmin) return;
      void appModules.stations.list().then((result) => {
        if (result.ok) setStations(result.value);
        else setError(result.error.message);
      });
    }, [isAdmin]),
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={containerStyles.wrapper}>
        <Text style={textStyles.pageTitle}>You should not be here!</Text>
        <Button
          style={buttonStyles.smallButtonTopLeft}
          onPress={() => router.push('/(app)/(tabs)')}
        >
          <Ionicons name="arrow-back-outline" size={25} color="#fff" />
        </Button>
      </SafeAreaView>
    );
  }

  const filteredStations = stations.filter((station) => {
    const { isStocked } = appModules.stations.stockStatus(station);
    if (filter === 'Stocked') return isStocked;
    if (filter === 'Unstocked') return !isStocked;
    return true;
  });

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Errorbar error={error} onDismiss={() => setError('')} />
      <View style={containerStyles.buttonGroup}>
        {['Stocked', 'Unstocked', 'All'].map((label) => (
          <Button
            key={label}
            style={[
              buttonStyles.rowButton2,
              filter === label && buttonStyles.activeButton,
            ]}
            onPress={() => setFilter(label as typeof filter)}
            textStyle={[
              textStyles.buttonText,
              filter === label && textStyles.activeText,
            ]}
          >
            {label}
          </Button>
        ))}
      </View>
      <Text style={textStyles.pageTitle}>Feeding Stations</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {filteredStations.map((station) => (
          <StationItem
            key={station.id}
            station={station}
            status={appModules.stations.stockStatus(station)}
          />
        ))}
      </ScrollView>
      <Button
        style={buttonStyles.bigButton}
        onPress={() => router.push('/stations/create-station')}
      >
        <Text style={textStyles.bigButtonText}>Create Station</Text>
      </Button>
    </SafeAreaView>
  );
};

export default Stations;
