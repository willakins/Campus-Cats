// CatalogItem.js
import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Button } from '../ui/Buttons';
import { CatalogEntry } from '@/types';
import DatabaseService from '../../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { setSelectedCatalogEntry } from '@/stores/CatalogEntryStores';

export const CatalogItem: React.FC<CatalogEntry> = 
({ id, cat, credits, createdAt, createdBy }) => {
  const router = useRouter();
  const [profile, setProfile] = useState<string>('');
  const database = DatabaseService.getInstance();

  useEffect(() => {
    database.fetchCatImages(id, setProfile);
  }, []);

  const createObj = () => {
    const newEntry = new CatalogEntry({
      id:id,
      cat:cat,
      credits:credits,
      createdAt:createdAt,
      createdBy:createdBy,
    });
    setSelectedCatalogEntry(newEntry);
  }

  return (
    <Button style={containerStyles.card} onPress={() => {
      createObj();
      router.push('/catalog/view-entry')
    }}>
      
      <View style={containerStyles.listDetailsContainer}>
        <Text style={textStyles.listTitle}>{cat.name}</Text>
        {profile ? (
          <Image source={{ uri: profile }} style={[containerStyles.imageMain, {marginBottom:5}]} resizeMode="cover" />
        ) : (
          <View><Text style={[textStyles.listTitle, {textAlign: 'center'}]}>Loading...</Text></View>
        )}
        <Text style={[textStyles.detail, {alignSelf:'center', marginVertical:0}]}>{cat.descShort}</Text>
      </View>
    </Button>
  );
};
export default CatalogItem;