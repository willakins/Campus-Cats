import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button } from '../ui/Buttons';
import { Station } from '@/types';
import DatabaseService from '../../services/DatabaseService';
import { Checkbox } from "react-native-paper";
import { setSelectedStation } from '@/stores/stationStores';
import { containerStyles, textStyles } from '@/styles';

export const StationItem: React.FC<Station> = ({
  id, name, location, lastStocked, stockingFreq,
  knownCats, isStocked, createdBy
}) => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const [profile, setProfile] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);

  const createObj = () => {
    const newStation = new Station({
      id, name, location, lastStocked, stockingFreq,
      knownCats, isStocked, createdBy
    });
    setSelectedStation(newStation);
  };

  useFocusEffect(() => {
    database.fetchStationImages(id, setProfile, setPhotos);
  });

  return (
    <Button style={[containerStyles.card, {paddingTop:10}]} onPress={() => {
      createObj();
      router.push('/stations/view-station');
    }}>
      
      
        <View style={containerStyles.listDetailsContainer}>
          <Text style={textStyles.listTitle}>{name}</Text>
          <View style={containerStyles.rowContainer}>
            {profile ? (
              <Image source={{ uri: profile }} style={containerStyles.cardImage} />
            ) : (
              <View style={containerStyles.cardImage}><Text>Loading...</Text></View>
            )}
            <View style={containerStyles.columnContainer}>
              <View style={containerStyles.rowContainer}>
                <Text style={[textStyles.detail, { color: isStocked ? "green" : "red", marginVertical:0 }]}>
                  {isStocked ? "Has Food" : "Needs Food"}
                </Text>
                <Checkbox
                  status={isStocked ? "checked" : "unchecked"}
                  color="green"
                />
              </View>
              <Text style={[textStyles.detail, {marginVertical:0, flexWrap:'wrap'}]}>Known Cats: {knownCats}</Text>
            </View>
          </View>
        </View>
    </Button>
  );
};
export default StationItem;