import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import { Button, CatalogItem } from '@/components';
import { useAuth } from '@/providers';
import DatabaseService from '@/services/DatabaseService';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { CatalogEntry } from '@/types';

const Catalog = () => {
  const { user } = useAuth();
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const adminStatus = user.role === 1 || user.role === 2;
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([]);

  useFocusEffect(() => {
    void database.fetchCatalogData(setCatalogEntries);
  });

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Text style={textStyles.pageTitle}>Catalog</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {catalogEntries.map((entry) => (
          <CatalogItem
            key={entry.id}
            id={entry.id}
            cat={entry.cat}
            credits={entry.credits}
            createdAt={entry.createdAt}
            createdBy={entry.createdBy}
          />
        ))}
      </ScrollView>
      {adminStatus ? (
        <Button
          style={buttonStyles.bigButton}
          onPress={() => router.push('/catalog/create-entry')}
        >
          <Text style={textStyles.bigButtonText}> Create Entry</Text>
        </Button>
      ) : null}
    </SafeAreaView>
  );
};
export default Catalog;
