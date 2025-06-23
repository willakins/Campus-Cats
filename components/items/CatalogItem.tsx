// CatalogItem.js
import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import DatabaseService from '../../services/DatabaseService';
import { Button } from '../ui/Buttons';
import { useRouter } from 'expo-router';

import { setSelectedCatalogEntry } from '@/stores/CatalogEntryStores';
import {
  buttonStyles,
  containerStyles,
  globalStyles,
  textStyles,
} from '@/styles';
import { CatalogEntry } from '@/types';

export const CatalogItem: React.FC<CatalogEntry> = ({
  id,
  cat,
  credits,
  createdAt,
  createdBy,
}) => {
  const router = useRouter();
  const [profile, setProfile] = useState<string>('');
  const database = DatabaseService.getInstance();

  useEffect(() => {
    database.fetchCatImages(id, setProfile);
  }, []);

  const createObj = () => {
    const newEntry = new CatalogEntry({
      id: id,
      cat: cat,
      credits: credits,
      createdAt: createdAt,
      createdBy: createdBy,
    });
    setSelectedCatalogEntry(newEntry);
  };

  return (
    <Button
      style={containerStyles.card}
      onPress={() => {
        createObj();
        router.push('/catalog/view-entry');
      }}
    >
      <Text style={textStyles.listTitle}>{cat.name}</Text>
      {profile ? (
        <Image
          source={{ uri: profile }}
          style={containerStyles.listImage}
          resizeMode="cover"
        />
      ) : (
        <View style={containerStyles.listImage}>
          <Text style={textStyles.listTitle}>Loading...</Text>
        </View>
      )}
      <Text style={[textStyles.detail, { alignSelf: 'center' }]}>
        {cat.descShort}
      </Text>
    </Button>
  );
};
export default CatalogItem;
