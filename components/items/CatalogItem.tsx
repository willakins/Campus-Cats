// CatalogItem.js
import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Button } from '../ui/Buttons';
import { CatalogEntryObject } from '@/types';
import DatabaseService from '../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

export const CatalogItem: React.FC<CatalogEntryObject> = 
({ id, name, descShort, descLong, colorPattern, behavior, yearsRecorded, AoR, currentStatus, furLength, furPattern, tnr, sex, credits }) => {
  const router = useRouter();
  const [profileURL, setProfile] = useState<string>('');
  const database = DatabaseService.getInstance();

  useEffect(() => {
    database.fetchCatImages(id, setProfile);
  }, []);

  return (
    <Button style={containerStyles.entryContainer} onPress={() =>
      router.push({
      pathname: '/catalog/view-entry',
      params: { id:id, name:name, descShort:descShort, descLong:descLong, colorPattern:colorPattern, behavior:behavior, yearsRecorded:yearsRecorded, AoR:AoR, 
        currentStatus:currentStatus, furLength:furLength, furPattern:furPattern, tnr:tnr, sex:sex, credits:credits},
      })}>
      <View style={containerStyles.entryElements}>
        <Text style={textStyles.catalogTitle}>{name}</Text>
        {profileURL ? (<Image source={{ uri: profileURL }} style={containerStyles.listImage} />) : 
          <Text style={textStyles.title}>Loading image...</Text>}
        <Text style={textStyles.catalogDescription}>{colorPattern}</Text>
      </View>
    </Button>
  );
};
export default CatalogItem;