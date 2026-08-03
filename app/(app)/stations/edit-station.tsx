import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, LoadingIndicator, SnackbarMessage } from '@/components';
import { appModules } from '@/composition/appModules';
import { Station, parseUser } from '@/core/domain';
import { localMedia, storedMedia } from '@/core/media';
import { StoredMediaAsset } from '@/core/ports';
import { StationForm } from '@/forms';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const EditStation = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [station, setStation] = useState<Station>();
  const [storedAssets, setStoredAssets] = useState<readonly StoredMediaAsset[]>([]);
  const [profile, setProfile] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: { latitude: 0, longitude: 0 },
    lastStocked: new Date(),
    stockingFreq: 7,
    knownCats: '',
  });

  useEffect(() => {
    if (!id) return;
    void Promise.all([appModules.stations.get(id), appModules.stations.media(id)]).then(
      ([stationResult, mediaResult]) => {
        if (!stationResult.ok) {
          Alert.alert('Could not load station', stationResult.error.message);
          return;
        }
        const loaded = stationResult.value;
        setStation(loaded);
        setFormData({
          name: loaded.name,
          location: loaded.location,
          lastStocked: loaded.lastStocked,
          stockingFreq: loaded.stockingFreq,
          knownCats: loaded.knownCats,
        });
        if (mediaResult.ok) {
          setStoredAssets(mediaResult.value);
          setProfile(
            mediaResult.value.find(({ role }) => role === 'profile')?.url ?? '',
          );
          setPhotos(
            mediaResult.value
              .filter(({ role }) => role === 'gallery')
              .map(({ url }) => url),
          );
        }
      },
    );
  }, [id]);

  const selectionFor = (uri: string) => {
    const stored = storedAssets.find((asset) => asset.url === uri);
    return stored ? storedMedia(stored.id) : localMedia(uri);
  };
  const promotePhoto = (uri: string) => {
    setPhotos((current) => [profile, ...current.filter((photo) => photo !== uri)].filter(Boolean));
    setProfile(uri);
  };
  const save = async () => {
    if (!station || !profile) {
      Alert.alert('Could not save station', 'Please select a profile photo.');
      return;
    }
    setVisible(true);
    const result = await appModules.stations.update(parseUser(user), station.id, {
      ...formData,
      profile: selectionFor(profile),
      gallery: photos.map(selectionFor),
    });
    setVisible(false);
    if (!result.ok) {
      Alert.alert('Could not save station', result.error.message);
      return;
    }
    router.replace({ pathname: '/stations/view-station', params: { id: station.id } });
  };
  const confirmDelete = () => {
    if (!station) return;
    Alert.alert('Delete Station', 'Delete this station forever?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever',
        style: 'destructive',
        onPress: () =>
          void appModules.stations.remove(parseUser(user), station.id).then((result) => {
            if (result.ok) router.replace('/stations');
            else Alert.alert('Could not delete station', result.error.message);
          }),
      },
    ]);
  };

  if (!station) return <LoadingIndicator />;
  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={router.back}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage text="Saving Station..." visible={visible} setVisible={setVisible} />
      <Text style={textStyles.pageTitle}>Edit Station</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <StationForm
          formData={formData}
          setFormData={setFormData}
          photos={photos}
          profile={profile}
          setPhotos={setPhotos}
          onPromotePhoto={promotePhoto}
          onDeletePhoto={(uri) =>
            setPhotos((current) => current.filter((photo) => photo !== uri))
          }
          isCreate={false}
        />
      </ScrollView>
      <Button style={buttonStyles.bigButton} onPress={() => void save()}>
        <Text style={textStyles.bigButtonText}>Save Station</Text>
      </Button>
      <Button style={buttonStyles.bigDeleteButton} onPress={confirmDelete}>
        <Text style={textStyles.bigButtonText}>Delete Station</Text>
      </Button>
    </SafeAreaView>
  );
};

export default EditStation;
