import React, {  useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import { Button, CatalogItem } from '@/components';
import { CatalogEntry} from '@/types';
import DatabaseService from '@/services/DatabaseService';
import { useAuth } from '@/providers';

import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const Catalog = () => {
  const { user } = useAuth();
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const adminStatus = user.role === 1 || user.role === 2;
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([]);

  useFocusEffect(() => {
    database.fetchCatalogData(setCatalogEntries);
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
      {adminStatus ? <Button style={buttonStyles.bigButton} onPress={() => router.push('/catalog/create-entry')}>
        <Text style ={textStyles.bigButtonText}> Create Entry</Text>
      </Button> : null}
    </SafeAreaView>
  );
}
export default Catalog;