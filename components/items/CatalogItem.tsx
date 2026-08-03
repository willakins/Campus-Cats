import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { appModules } from '@/composition/appModules';
import { CatalogEntry } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { containerStyles, textStyles } from '@/styles';

import { Button } from '../ui/Buttons';

export const CatalogItem: React.FC<CatalogEntry> = (entry) => {
  const router = useRouter();
  const [profile, setProfile] = useState<StoredMediaAsset>();

  useEffect(() => {
    void appModules.catalog.media(entry.id).then((result) => {
      if (result.ok) {
        setProfile(result.value.find(({ role }) => role === 'profile'));
      }
    });
  }, [entry.id]);

  return (
    <Button
      style={containerStyles.card}
      onPress={() =>
        router.push({ pathname: '/catalog/view-entry', params: { id: entry.id } })
      }
    >
      <Text style={textStyles.listTitle}>{entry.cat.name}</Text>
      {profile ? (
        <Image
          source={{ uri: profile.url }}
          style={containerStyles.listImage}
          resizeMode="cover"
        />
      ) : (
        <View style={containerStyles.listImage}>
          <Text style={textStyles.listTitle}>No profile photo</Text>
        </View>
      )}
      <Text style={[textStyles.detail, { alignSelf: 'center' }]}>
        {entry.cat.descShort}
      </Text>
    </Button>
  );
};

export default CatalogItem;
