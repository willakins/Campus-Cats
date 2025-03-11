import React, {  useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { useRouter } from 'expo-router';

import { Button, CatalogItem } from '@/components';
import { CatalogEntryObject } from '@/types';
import DatabaseService from '@/components/DatabaseService';
import { useAuth } from '@/providers';

import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const Catalog = () => {
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntryObject[]>([]);
  const { signOut, user } = useAuth();
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const adminStatus = user.role === 1 || user.role === 2;

  useEffect(() => {
    database.fetchCatalogData(setCatalogEntries);
  }, []);

  return (
    <SafeAreaView style={containerStyles.container}>
      <Text style={textStyles.title}>Catalog</Text>
      {adminStatus ? <Button style={buttonStyles.editButton} onPress={() => router.push('/catalog/create-entry')}>
        <Text style ={textStyles.editText}> Create Entry</Text>
      </Button> : null}
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {catalogEntries.map((entry) => (
          <CatalogItem
            key={entry.id}
            id={entry.id}
            name={entry.name}
            info={entry.info}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
export default Catalog;