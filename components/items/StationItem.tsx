import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Checkbox } from 'react-native-paper';

import DatabaseService from '../../services/DatabaseService';
import { Button } from '../ui/Buttons';
import { useFocusEffect, useRouter } from 'expo-router';

import { setSelectedStation } from '@/stores/stationStores';
import { containerStyles, textStyles } from '@/styles';
import { Station } from '@/types';

export const StationItem: React.FC<Station> = ({
  id,
  name,
  location,
  lastStocked,
  stockingFreq,
  knownCats,
  isStocked,
  createdBy,
}) => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const [profile, setProfile] = useState<string>('');
  // TODO: Remove this.
  // Filler code to work with fetchStationImages, since a setState is needed but
  // no state is ever used here.
  const setPhotos = (_: any) => {};

  const createObj = () => {
    const newStation = new Station({
      id,
      name,
      location,
      lastStocked,
      stockingFreq,
      knownCats,
      isStocked,
      createdBy,
    });
    setSelectedStation(newStation);
  };

  useFocusEffect(() => {
    database.fetchStationImages(id, setProfile, setPhotos);
  });

  return (
    <Button
      style={containerStyles.card}
      onPress={() => {
        createObj();
        router.push('/stations/view-station');
      }}
    >
      <Text style={textStyles.listTitle}>{name}</Text>
      <View style={containerStyles.rowContainer}>
        {profile ? (
          <Image source={{ uri: profile }} style={containerStyles.cardImage} />
        ) : (
          <View style={containerStyles.cardImage}>
            <Text style={textStyles.listTitle}>Loading...</Text>
          </View>
        )}
        <View style={containerStyles.columnContainer}>
          <View style={containerStyles.rowContainer}>
            <Text
              style={[
                textStyles.detail,
                { color: isStocked ? 'green' : 'red', marginVertical: 0 },
              ]}
            >
              {isStocked ? 'Has Food' : 'Needs Food'}
            </Text>
            <Checkbox
              status={isStocked ? 'checked' : 'unchecked'}
              color="green"
            />
          </View>
          <Text style={[textStyles.detail, { flexWrap: 'wrap' }]}>
            Known Cats: {knownCats}
          </Text>
        </View>
      </View>
    </Button>
  );
};
export default StationItem;
