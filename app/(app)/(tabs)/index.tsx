import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import DatabaseService from '@/components/services/DatabaseService';
import { Button, SightingMapView } from '@/components';
import { Sighting} from '@/types';
import { setSelectedSighting } from '@/stores/sightingStore';

import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const HomeScreen = () => {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [mapKey, setMapKey] = useState(0);
  const [pins, setPins] = useState<Sighting[]>([]);
  const database = DatabaseService.getInstance();

  useFocusEffect(
    useCallback(() => {
      database.fetchPins(setPins, setMapKey);
    }, [])
  );

  const filterPins = (pin: Sighting) => {
    if (filter === 'all') return true;
    const days = parseInt(filter);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return new Date(pin.date) >= cutoffDate;
  };

  const viewSighting = (pin: Sighting) => {
    setSelectedSighting(pin);
    router.push('sighting/view-sighting');
    router.push({ pathname: '/sighting/view-report', params: {
      id: pin.id,
      date: pin.date,
      catFed: pin.fed ? 'true':'false',
      catHealth: pin.health ? 'true':'false',
      info: pin.info,
      catLongitude: JSON.stringify(pin.longitude),
      catLatitude: JSON.stringify(pin.latitude),
      name: pin.name,
      uid: pin.uid,
      timeofDay: pin.timeofDay,
    }})
  };

  return (
    <View style={globalStyles.homeScreen}>
      <View style={containerStyles.buttonGroup}>
        {['7', '30', '90', '365', 'all'].map(range => (
          <Button
            key={range}
            style={[buttonStyles.filterButton, filter === range && buttonStyles.activeButton]}
            onPress={() => setFilter(range)}
            textStyle={[textStyles.buttonText, filter === range && textStyles.activeText]}
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
        onPerMarkerPress={viewSighting}
      />
      <Button
        style={buttonStyles.reportButton}
        onPress={() => router.push('/sighting/create-report')}
        textStyle={textStyles.buttonText}
      >
        Report
      </Button>
    </View>
  );
};
export default HomeScreen;
