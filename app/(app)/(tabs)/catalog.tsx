import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import { Button, CatalogItem, Errorbar } from '@/components';
import { appModules } from '@/composition/appModules';
import { CatalogEntry } from '@/core/domain';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const Catalog = () => {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user.role === 1 || user.role === 2;
  const [entries, setEntries] = useState<readonly CatalogEntry[]>([]);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      void appModules.catalog.list().then((result) => {
        if (result.ok) setEntries(result.value);
        else setError(result.error.message);
      });
    }, []),
  );

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Errorbar error={error} onDismiss={() => setError('')} />
      <Text style={textStyles.pageTitle}>Catalog</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {entries.map((entry) => (
          <CatalogItem key={entry.id} {...entry} />
        ))}
      </ScrollView>
      {isAdmin ? (
        <Button
          style={buttonStyles.bigButton}
          onPress={() => router.push('/catalog/create-entry')}
        >
          <Text style={textStyles.bigButtonText}>Create Entry</Text>
        </Button>
      ) : null}
    </SafeAreaView>
  );
};

export default Catalog;
