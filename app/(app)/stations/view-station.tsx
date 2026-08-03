import React, { useCallback, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Button, LoadingIndicator, SnackbarMessage, StationEntry } from '@/components';
import { appModules } from '@/composition/appModules';
import { Station, parseUser } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const ViewStation = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [station, setStation] = useState<Station>();
  const [media, setMedia] = useState<readonly StoredMediaAsset[]>([]);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const isAdmin = user.role === 1 || user.role === 2;

  const load = useCallback(() => {
    if (!id) {
      setError('Missing station ID');
      return;
    }
    void Promise.all([appModules.stations.get(id), appModules.stations.media(id)]).then(
      ([stationResult, mediaResult]) => {
        if (stationResult.ok) setStation(stationResult.value);
        else setError(stationResult.error.message);
        if (mediaResult.ok) setMedia(mediaResult.value);
      },
    );
  }, [id]);
  useFocusEffect(load);

  const restock = async () => {
    if (!station) return;
    setVisible(true);
    const result = await appModules.stations.restock(parseUser(user), station.id);
    setVisible(false);
    if (result.ok) setStation(result.value);
    else Alert.alert('Could not refill station', result.error.message);
  };

  if (!station && !error) return <LoadingIndicator />;

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage text="Refilling..." visible={visible} setVisible={setVisible} />
      {station ? (
        <>
          <ScrollView contentContainerStyle={containerStyles.scrollView}>
            <StationEntry
              station={station}
              status={appModules.stations.stockStatus(station)}
              media={media}
            />
          </ScrollView>
          <Button style={buttonStyles.bigButton} onPress={() => void restock()}>
            <Text style={textStyles.bigButtonText}>Refill Station</Text>
          </Button>
          {isAdmin ? (
            <Button
              style={buttonStyles.bigButton}
              onPress={() =>
                router.push({
                  pathname: '/stations/edit-station',
                  params: { id: station.id },
                })
              }
            >
              <Text style={textStyles.bigButtonText}>Edit Station</Text>
            </Button>
          ) : null}
        </>
      ) : (
        <Text style={textStyles.pageTitle}>{error}</Text>
      )}
    </SafeAreaView>
  );
};

export default ViewStation;
