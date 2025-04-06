import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import { Button, SightingMapView } from '@/components';
import { CatSightingObject } from '@/types';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const HomeScreen = () => {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [mapKey, setMapKey] = useState(0);
  const [pins, setPins] = useState<CatSightingObject[]>([]);
  const database = DatabaseService.getInstance();

  useFocusEffect(
    useCallback(() => {
      database.fetchPins(setPins, setMapKey);
    }, [])
  );

  const filterPins = (pin: CatSightingObject) => {
    if (filter === 'all') return true;
    const days = parseInt(filter);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return new Date(pin.date) >= cutoffDate;
  };

  const viewSighting = (pin: CatSightingObject) => {
    router.push({ pathname: '/sighting/view-report', params: {
      docId: pin.id,
      catDate: JSON.stringify(pin.date),
      catFed: pin.fed ? 'true':'false',
      catHealth: pin.health ? 'true':'false',
      catPhoto: pin.photoUrl,
      catInfo: pin.info,
      catLongitude: JSON.stringify(pin.longitude),
      catLatitude: JSON.stringify(pin.latitude),
      catName: pin.name,
      createdBy: pin.uid
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
