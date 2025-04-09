import { SafeAreaView, ScrollView, Text } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, StationEntry } from '@/components';
import { useAuth } from '@/providers';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import DatabaseService from '@/services/DatabaseService';

const view_entry = () =>{
  const { user } = useAuth();
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const isAdmin = user.role === 1 || user.role === 2;

  return (
    <SafeAreaView style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.navigate('/stations')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <StationEntry/>
      </ScrollView>
      <Button style={buttonStyles.button2} onPress={() => database.stockStation(router)}>
        <Text style={textStyles.bigButtonText}>Refill Station</Text>
      </Button>
      {isAdmin ? <Button style={buttonStyles.button2} onPress={() => router.push('/stations/edit-station')}>
        <Text style ={textStyles.bigButtonText}> Edit Station</Text>
      </Button> : null}
    </SafeAreaView>
  );
}
export default view_entry;
