import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Button } from '../ui/Buttons';
import { CatalogEntryObject } from '@/types';
import DatabaseService from '../DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

export const StationItem: React.FC<CatalogEntryObject> = ({ id, name, info }) => {
  const router = useRouter();
  const [profileURL, setProfile] = useState<string>('');
  const database = DatabaseService.getInstance();

  useEffect(() => {
    database.fetchCatImages(name, setProfile);
  }, []);

  return (
    <Button style={containerStyles.entryContainer} onPress={() =>
      router.push({
      pathname: '/catalog/view-entry',
      params: { paramId:id, paramName:name, paramInfo:info },
      })}>
      <View style={containerStyles.entryElements}>
        <Text style={textStyles.catalogTitle}>{name}</Text>
        {profileURL ? (<Image source={{ uri: profileURL }} style={containerStyles.listImage} />) : 
          <Text style={textStyles.title}>Loading image...</Text>}
        <Text style={textStyles.catalogDescription}>{info}</Text>
      </View>
    </Button>
  );
};
export default StationItem;