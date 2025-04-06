import { SafeAreaView, Text } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, StationEntry } from '@/components';
import { useAuth } from '@/providers';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const view_entry = () =>{
  const { signOut, user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const router = useRouter();
  const { id, name, profile, catLongitude, catLatitude, knownCats, lastStocked, stockingFreq, stocked} = useLocalSearchParams() as { id:string, name:string, profile:string, 
    catLongitude:string, catLatitude:string, knownCats:string, lastStocked:string, stockingFreq:string, stocked:string};
  const longitude = +(catLongitude);
  const latitude = +(catLatitude);
  const isStocked = stocked === "true";

  return (
    <SafeAreaView style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.navigate('/stations')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {isAdmin ? <Button style={buttonStyles.editButton} onPress={() => router.push({
        pathname: '/stations/edit-station',
        params: { id:id, name:name, catLongitude:longitude, catLatitude:latitude, lastStocked:lastStocked, knownCats:knownCats, stockingFreq:stockingFreq },
      })}>
        <Text style ={textStyles.editText}> Edit Station</Text>
      </Button> : null}
      <StationEntry
          key={id}
          id={id}
          name={name}
          profile={profile}
          longitude={longitude}
          latitude={latitude}
          lastStocked={lastStocked}
          stockingFreq={stockingFreq}
          knownCats={knownCats}
          isStocked={isStocked}
        />
    </SafeAreaView>
  );
}
export default view_entry;
