import { useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { useRouter } from 'expo-router';

import {
  BackButton,
  Button,
  SnackbarMessage,
  StationEntry,
} from '@/components';
import { useAuth } from '@/providers';
import DatabaseService from '@/services/DatabaseService';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const ViewEntry = () => {
  const { user } = useAuth();
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const [visible, setVisible] = useState<boolean>(false);
  const isAdmin = user.role === 1 || user.role === 2;

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <BackButton />
      <SnackbarMessage
        text="Refilling..."
        visible={visible}
        setVisible={setVisible}
      />
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <StationEntry />
      </ScrollView>
      <Button
        style={buttonStyles.bigButton}
        onPress={() => database.stockStation(setVisible, router)}
      >
        <Text style={textStyles.bigButtonText}>Refill Station</Text>
      </Button>
      {isAdmin ? (
        <Button
          style={buttonStyles.bigButton}
          onPress={() => router.push('/stations/edit-station')}
        >
          <Text style={textStyles.bigButtonText}> Edit Station</Text>
        </Button>
      ) : null}
    </SafeAreaView>
  );
};
export default ViewEntry;
