import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import { Button, Errorbar, SightingMapView } from '@/components';
import { appModules } from '@/composition/appModules';
import { Sighting, SystemClock } from '@/core/domain';
import { filterSightingsByAge } from '@/features/sightings';
import { buttonStyles, containerStyles, globalStyles, textStyles } from '@/styles';

const clock = new SystemClock();

const HomeScreen = () => {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [mapKey, setMapKey] = useState(0);
  const [pins, setPins] = useState<readonly Sighting[]>([]);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void appModules.sightings.list().then((result) => {
        if (!active) return;
        if (result.ok) {
          setPins(result.value);
          setMapKey((value) => value + 1);
        } else {
          setError(result.error.message);
        }
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const visiblePins = filterSightingsByAge(
    pins,
    filter === 'all' ? undefined : Number(filter),
    clock,
  );

  return (
    <View style={globalStyles.screen}>
      <Errorbar error={error} onDismiss={() => setError('')} />
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
        list={visiblePins}
        filter={() => true}
        key={mapKey}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 33.776077,
          longitude: -84.396199,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPerMarkerPress={(pin) =>
          router.push({
            pathname: '/sighting/view-sighting',
            params: { id: pin.id },
          })
        }
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
