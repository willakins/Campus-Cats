// CatalogItem.js
import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Pressable } from 'react-native';

import { useRouter } from 'expo-router';

import DatabaseService from '@/services/DatabaseService';
import { setSelectedCatalogEntry } from '@/stores/CatalogEntryStores';
import { containerStyles, textStyles } from '@/styles';
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
    void database.fetchCatImages(id, setProfile);
    // NOTE: database is a singleton class provided by DatabaseService and
    // will never change; it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <Pressable
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
    </Pressable>
  );
};
export default CatalogItem;
