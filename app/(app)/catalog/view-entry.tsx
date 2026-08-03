import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Button, CatalogEntryElement, LoadingIndicator } from '@/components';
import { appModules } from '@/composition/appModules';
import { CatalogEntry, Sighting } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const ViewEntry = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [entry, setEntry] = useState<CatalogEntry>();
  const [media, setMedia] = useState<readonly StoredMediaAsset[]>([]);
  const [sightings, setSightings] = useState<readonly Sighting[]>([]);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setError('Missing catalog entry ID');
        return;
      }
      void Promise.all([
        appModules.catalog.get(id),
        appModules.catalog.media(id),
        appModules.sightings.list(),
      ]).then(([entryResult, mediaResult, sightingsResult]) => {
        if (entryResult.ok) setEntry(entryResult.value);
        else setError(entryResult.error.message);
        if (mediaResult.ok) setMedia(mediaResult.value);
        if (entryResult.ok && sightingsResult.ok) {
          setSightings(
            sightingsResult.value.filter(
              ({ name }) => name === entryResult.value.cat.name,
            ),
          );
        }
      });
    }, [id]),
  );

  if (!entry && !error) return <LoadingIndicator />;

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {entry ? (
        <>
          <ScrollView
            contentContainerStyle={[containerStyles.scrollView, { paddingTop: '10%' }]}
          >
            <CatalogEntryElement
              entry={entry}
              media={media}
              sightings={sightings}
            />
          </ScrollView>
          {user.role === 1 || user.role === 2 ? (
            <Button
              style={buttonStyles.bigButton}
              onPress={() =>
                router.push({
                  pathname: '/catalog/edit-entry',
                  params: { id: entry.id },
                })
              }
            >
              <Text style={textStyles.bigButtonText}>Edit Entry</Text>
            </Button>
          ) : null}
        </>
      ) : (
        <Text style={textStyles.pageTitle}>{error}</Text>
      )}
    </SafeAreaView>
  );
};

export default ViewEntry;
