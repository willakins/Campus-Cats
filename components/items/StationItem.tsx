import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';
import { Button } from '../ui/Buttons';
import { Station } from '@/types';
import DatabaseService from '../../services/DatabaseService';
import { Checkbox } from "react-native-paper";
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { setSelectedStation } from '@/stores/stationStores';

export const StationItem: React.FC<Station> = ({ id, name, location, lastStocked, stockingFreq, 
  knownCats, isStocked, createdBy}) => {
  const router = useRouter();
  const database = DatabaseService.getInstance();

  const [profileURL, setProfile] = useState<string>('');

  const createObj = () => {
    const newStation = new Station({
      id, 
      name, 
      location, 
      lastStocked, 
      stockingFreq, 
      knownCats, 
      isStocked, 
      createdBy});
    setSelectedStation(newStation);
  }

  useFocusEffect(() => {
    database.fetchStationImages(id, name, setProfile);
  });

  return (
    <Button style={containerStyles.card} onPress={() => {
      createObj();
      router.push('/stations/view-station')
    }}>
      <View>
    <View style={containerStyles.stationHeader}>
      {profileURL ? (
        <Image source={{ uri: profileURL }} style={containerStyles.stationImage} />
      ) : (
        <Text style={textStyles.stationTitle}>Loading...</Text>
      )}
      <Text style={textStyles.stationTitle}>{name}</Text>
    </View>
    
    <View style={containerStyles.statusContainer}>
      <Text style={[textStyles.statusText2, { color: isStocked ? "green" : "red" }]}>
        {isStocked ? "Has Food" : "Needs Food"}
      </Text>
      <Checkbox
        status={isStocked ? "checked" : "unchecked"}
        color={isStocked ? "green" : "green"}
      />
    </View>

    <Text style={textStyles.knownCats}>Known Cats: {knownCats}</Text>
  </View>
    </Button>
  );
};
export default StationItem;