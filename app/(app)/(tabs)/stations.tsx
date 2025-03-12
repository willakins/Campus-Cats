import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { useAuth } from '@/providers';
import { Ionicons } from '@expo/vector-icons';
import { Button, StationItem } from '@/components';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import DatabaseService from '@/components/services/DatabaseService';
import { StationEntryObject } from '@/types';

const Stations = () => {
  const { signOut, user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const router = useRouter();
  const database = DatabaseService.getInstance();

  if (!isAdmin) { // Double safety so important info isn't leaked
    return (
      <SafeAreaView style={containerStyles.container}>
        <Text style ={textStyles.catalogTitle}> You should not be here!</Text>
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/(app)/(tabs)')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
    </SafeAreaView>);
  } else {
    const [stationEntries, setStationEntries] = useState<StationEntryObject[]>([]);

    useEffect(() => {
      database.fetchStations(setStationEntries);
    }, []);

    return (
      <SafeAreaView style={containerStyles.container}>
            <Text style={textStyles.title}>Feeding Stations</Text>
            <Button style={buttonStyles.editButton} onPress={() => router.push('/stations/create-station')}>
              <Text style ={textStyles.editText}> Create Entry</Text>
            </Button>
            <ScrollView contentContainerStyle={containerStyles.scrollView}>
              {stationEntries.map((station) => (
                <StationItem
                  key={station.id}
                  id={station.id}
                  name={station.name}
                  profilePic={station.profilePic}
                  longitude={station.longitude}
                  latitude={station.latitude}
                  lastStocked={station.lastStocked}
                  stockingFreq={station.stockingFreq}
                  knownCats={station.knownCats}
                />
              ))}
            </ScrollView>
          </SafeAreaView>
    );
  }
  
};
export default Stations