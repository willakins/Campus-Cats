import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage } from '@/components';
import { WhitelistItem } from '@/components/items/WhitelistItem';
import DatabaseService from '@/services/DatabaseService';
import {
  buttonStyles,
  containerStyles,
  globalStyles,
  textStyles,
} from '@/styles';
import { WhitelistApp } from '@/types';

const ManageWhitelist = () => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const [visible, setVisible] = useState<boolean>(false);
  const [applicants, setApplicants] = useState<WhitelistApp[]>([]);

  useEffect(() => {
    database.fetchWhitelist(setApplicants);
  }, []);

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button
        style={buttonStyles.smallButtonTopLeft}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage
        text="Saving Whitelist..."
        visible={visible}
        setVisible={setVisible}
      />
      <Text style={textStyles.pageTitle}>View Whitelist Applications</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {applicants.map((app) => (
          <WhitelistItem
            key={app.id}
            app={app}
            setApps={setApplicants}
            setVisible={setVisible}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ManageWhitelist;
