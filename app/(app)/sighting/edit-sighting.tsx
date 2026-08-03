import React, { useEffect, useState } from 'react';
import { Alert, FlatList, SafeAreaView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, LoadingIndicator, SnackbarMessage } from '@/components';
import { appModules } from '@/composition/appModules';
import { Sighting, parseUser } from '@/core/domain';
import { localMedia, storedMedia } from '@/core/media';
import { StoredMediaAsset } from '@/core/ports';
import { SightingForm } from '@/forms';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const SightingEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [sighting, setSighting] = useState<Sighting>();
  const [storedAssets, setStoredAssets] = useState<readonly StoredMediaAsset[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [profile, setProfile] = useState('');
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    { label: 'Morning', value: 'Morning' },
    { label: 'Afternoon', value: 'Afternoon' },
    { label: 'Night', value: 'Night' },
  ]);
  const [formData, setFormData] = useState({
    name: '',
    info: '',
    fed: false,
    health: false,
    location: { latitude: 0, longitude: 0 },
    date: new Date(),
  });

  useEffect(() => {
    if (!id) return;
    void Promise.all([
      appModules.sightings.get(id),
      appModules.sightings.media(id),
    ]).then(([sightingResult, mediaResult]) => {
      if (!sightingResult.ok) {
        Alert.alert('Could not load report', sightingResult.error.message);
        return;
      }
      const loaded = sightingResult.value;
      setSighting(loaded);
      setValue(loaded.timeOfDay);
      setFormData({
        name: loaded.name,
        info: loaded.info,
        fed: loaded.fed,
        health: loaded.health,
        location: loaded.location,
        date: loaded.date,
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
    });
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
    if (!sighting || !profile) {
      Alert.alert('Could not save report', 'Please select a profile photo.');
      return;
    }
    setVisible(true);
    const result = await appModules.sightings.update(parseUser(user), sighting.id, {
      ...formData,
      timeOfDay: value,
      profile: selectionFor(profile),
      gallery: photos.map(selectionFor),
    });
    setVisible(false);
    if (!result.ok) {
      Alert.alert('Could not save report', result.error.message);
      return;
    }
    router.replace({
      pathname: '/sighting/view-sighting',
      params: { id: result.value.id },
    });
  };

  const confirmDelete = () => {
    if (!sighting) return;
    Alert.alert('Delete Report', 'Delete this sighting forever?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever',
        style: 'destructive',
        onPress: () => {
          setVisible(true);
          void appModules.sightings.remove(parseUser(user), sighting.id).then((result) => {
            setVisible(false);
            if (result.ok) router.replace('/(app)/(tabs)');
            else Alert.alert('Could not delete report', result.error.message);
          });
        },
      },
    ]);
  };

  if (!sighting) return <LoadingIndicator />;

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage
        text="Saving Report..."
        visible={visible}
        setVisible={setVisible}
      />
      <Text style={textStyles.pageTitle}>Edit Report</Text>
      <FlatList
        data={[1]}
        keyExtractor={() => 'sighting-form'}
        contentContainerStyle={containerStyles.scrollView}
        renderItem={() => (
          <SightingForm
            formData={formData}
            setFormData={setFormData}
            value={value}
            setValue={setValue}
            open={open}
            setOpen={setOpen}
            items={items}
            setItems={setItems}
            photos={photos}
            profile={profile}
            setPhotos={setPhotos}
            onPromotePhoto={promotePhoto}
            onDeletePhoto={(uri) =>
              setPhotos((current) => current.filter((photo) => photo !== uri))
            }
            isCreate={false}
          />
        )}
      />
      <Button style={buttonStyles.bigButton} onPress={() => void save()}>
        <Text style={textStyles.bigButtonText}>Save Report</Text>
      </Button>
      <Button style={buttonStyles.bigDeleteButton} onPress={confirmDelete}>
        <Text style={textStyles.bigButtonText}>Delete Report</Text>
      </Button>
    </SafeAreaView>
  );
};

export default SightingEditScreen;
