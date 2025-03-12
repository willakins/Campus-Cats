import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Button } from '../ui/Buttons';
import { StationEntryObject } from '@/types';
import DatabaseService from '../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

export const StationItem: React.FC<StationEntryObject> = ({ id, name, profilePic, longitude, latitude, lastStocked, stockingFreq, 
  knownCats}) => {
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
      params: { paramId:id, paramName:name, paramPic:profilePic, paramLong:longitude, paramLat:latitude, paramStocked:lastStocked,
                paramFreq:stockingFreq, paramCats:knownCats},
      })}>
      <View style={containerStyles.entryElements}>
        <Text style={textStyles.catalogTitle}>{name}</Text>
        {profileURL ? (<Image source={{ uri: profileURL }} style={containerStyles.listImage} />) : 
          <Text style={textStyles.title}>Loading image...</Text>}
        <Text style={textStyles.catalogDescription}>{knownCats}</Text>
      </View>
    </Button>
  );
};
export default StationItem;