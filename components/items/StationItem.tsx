import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Checkbox } from 'react-native-paper';

import { appModules } from '@/composition/appModules';
import { Station, StationStockStatus } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { containerStyles, textStyles } from '@/styles';

import { Button } from '../ui/Buttons';

interface StationItemProps {
  readonly station: Station;
  readonly status: StationStockStatus;
}

export const StationItem: React.FC<StationItemProps> = ({ station, status }) => {
  const router = useRouter();
  const [profile, setProfile] = useState<StoredMediaAsset>();

  useEffect(() => {
    void appModules.stations.media(station.id).then((result) => {
      if (result.ok) setProfile(result.value.find(({ role }) => role === 'profile'));
    });
  }, [station.id]);

  return (
    <Button
      style={containerStyles.card}
      onPress={() =>
        router.push({ pathname: '/stations/view-station', params: { id: station.id } })
      }
    >
      <Text style={textStyles.listTitle}>{station.name}</Text>
      <View style={containerStyles.rowContainer}>
        {profile ? (
          <Image source={{ uri: profile.url }} style={containerStyles.cardImage} />
        ) : (
          <View style={containerStyles.cardImage} />
        )}
        <View style={containerStyles.columnContainer}>
          <View style={containerStyles.rowContainer}>
            <Text
              style={[
                textStyles.detail,
                { color: status.isStocked ? 'green' : 'red', marginVertical: 0 },
              ]}
            >
              {status.isStocked ? 'Has Food' : 'Needs Food'}
            </Text>
            <Checkbox
              status={status.isStocked ? 'checked' : 'unchecked'}
              color="green"
            />
          </View>
          <Text style={[textStyles.detail, { flexWrap: 'wrap' }]}>
            Known Cats: {station.knownCats}
          </Text>
        </View>
      </View>
    </Button>
  );
};

export default StationItem;
