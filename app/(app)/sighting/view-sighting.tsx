import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Button, LoadingIndicator, SightingEntry } from '@/components';
import { appModules } from '@/composition/appModules';
import { Sighting } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const SightingScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [sighting, setSighting] = useState<Sighting>();
  const [media, setMedia] = useState<readonly StoredMediaAsset[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      if (!id) {
        setError('Missing sighting ID');
        setLoading(false);
        return () => {
          active = false;
        };
      }
      void Promise.all([
        appModules.sightings.get(id),
        appModules.sightings.media(id),
      ]).then(([sightingResult, mediaResult]) => {
        if (!active) return;
        if (sightingResult.ok) setSighting(sightingResult.value);
        else setError(sightingResult.error.message);
        if (mediaResult.ok) setMedia(mediaResult.value);
        else setError(mediaResult.error.message);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [id]),
  );

  if (loading) return <LoadingIndicator />;

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button
        style={buttonStyles.smallButtonTopLeft}
        onPress={() => router.push('/(app)/(tabs)')}
      >
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {sighting ? (
        <>
          <ScrollView contentContainerStyle={containerStyles.scrollViewPadded}>
            <SightingEntry sighting={sighting} media={media} />
          </ScrollView>
          {user.id === sighting.createdBy.id ? (
            <Button
              style={buttonStyles.bigButton}
              onPress={() =>
                router.push({
                  pathname: '/sighting/edit-sighting',
                  params: { id: sighting.id },
                })
              }
            >
              <Text style={textStyles.bigButtonText}>Edit</Text>
            </Button>
          ) : null}
        </>
      ) : (
        <Text style={textStyles.pageTitle}>{error || 'Sighting not found'}</Text>
      )}
    </SafeAreaView>
  );
};

export default SightingScreen;
