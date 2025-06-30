import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import { Button, SightingMapView } from '@/components';
import DatabaseService from '@/services/DatabaseService';
import { setSelectedSighting } from '@/stores/sightingStores';
import {
  buttonStyles,
  containerStyles,
  globalStyles,
  textStyles,
} from '@/styles';
import { Sighting } from '@/types';

const HomeScreen = () => {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [mapKey, setMapKey] = useState(0);
  const [pins, setPins] = useState<Sighting[]>([]);
  const database = DatabaseService.getInstance();

  useFocusEffect(
    useCallback(() => {
      void database.fetchPins(setPins, setMapKey);
      // NOTE: database is a singleton class provided by DatabaseService and
      // will never change; it does not need to be a dependency.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const filterPins = (pin: Sighting) => {
    if (filter === 'all') return true;
    const days = parseInt(filter);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return pin.date >= cutoffDate;
  };

  return (
    <View style={globalStyles.screen}>
      <View style={containerStyles.buttonGroup}>
        {['7', '30', '90', '365', 'all'].map((range) => (
          <Button
            key={range}
            style={[
              buttonStyles.rowButton2,
              filter === range && buttonStyles.activeButton,
            ]}
            onPress={() => setFilter(range)}
            textStyle={[
              textStyles.buttonText,
              filter === range && textStyles.activeText,
            ]}
          >
            {range === '365' ? '1Y' : range === 'all' ? 'All' : `${range}D`}
          </Button>
        ))}
      </View>

      <SightingMapView
        list={pins}
        filter={filterPins}
        key={mapKey}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 33.776077,
          longitude: -84.396199,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPerMarkerPress={(pin) => {
          setSelectedSighting(pin);
          router.push('/sighting/view-sighting');
        }}
      />
      <Button
        style={buttonStyles.reportButton}
        onPress={() => router.push('/sighting/create-sighting')}
        textStyle={textStyles.buttonText}
      >
        Report
      </Button>
    </View>
  );
};
export default HomeScreen;
