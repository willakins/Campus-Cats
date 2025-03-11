import React, { useState } from 'react';
import { View } from 'react-native';

import { useRouter } from 'expo-router';

import { Button, TextInput } from '@/components';
import DatabaseService from '@/components/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';

const CreateAdmins = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const database = DatabaseService.getInstance();

  return (
    <View style={containerStyles.profileContainer}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/(app)/(tabs)/settings')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>

      <TextInput
        placeholder="User email"
        onChangeText={setEmail}
      />
      <Button onPress={() => database.makeAdmin(email)}>
        Make administrator
      </Button>
    </View>
  );
};
export default CreateAdmins;