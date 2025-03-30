import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Button } from '../ui/Buttons';
import { StationEntryObject } from '@/types';
import DatabaseService from '../services/DatabaseService';
import { Checkbox } from "react-native-paper";
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

export const StationItem: React.FC<StationEntryObject> = ({ id, name, profilePic, longitude, latitude, lastStocked, stockingFreq, 
  knownCats, isStocked}) => {
  const router = useRouter();
  const [profileURL, setProfile] = useState<string>('');
  const database = DatabaseService.getInstance();
  const thisStation = new StationEntryObject(id, name, profilePic, longitude, latitude, lastStocked, stockingFreq, knownCats);

  useEffect(() => {
    database.fetchStationImages(profilePic, setProfile);
  }, []);

  return (
    <Button style={containerStyles.entryContainer} onPress={() =>
      router.push({
      pathname: '/stations/view-station',
      params: { paramId:id, paramName:name, paramPic:profilePic, paramLong:longitude, paramLat:latitude, paramStocked:JSON.stringify(isStocked), 
        paramCats:knownCats, paramLastStocked:lastStocked, paramStockingFreq:stockingFreq},
      })}>
      <View style={containerStyles.entryElements}>
        <Text style={textStyles.catalogTitle}>{name}</Text>
        <View style={containerStyles.stationsEntry}>
          {profileURL ? (<Image source={{ uri: profileURL }} style={containerStyles.listImage2} />) : 
          <Text style={textStyles.title}>Loading image...</Text>}
          <View style={containerStyles.stockContainer}>
            <Text style={[textStyles.normalText, { color: isStocked ? "green" : "red"}]}>
              {isStocked ? "Has Food" : "Needs Food"}
            </Text>
            <View style={containerStyles.checkboxContainer}>
              <Checkbox
                status={isStocked ? "checked" : "unchecked"}
                color={isStocked ? "green" : "green"} // Red when needs restocking, green when stocked
              />
            </View>
          </View>
        </View> 
        
        <Text style={textStyles.catalogDescription}>Known Cats: {knownCats}</Text>
      </View>
    </Button>
  );
};
export default StationItem;