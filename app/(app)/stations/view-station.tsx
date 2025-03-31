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
  const { paramId, paramName, paramLong, paramLat, paramStocked, paramCats, paramLastStocked, paramStockingFreq} = useLocalSearchParams();
  const id = paramId as string;
  const name = paramName as string;
  const longitude = (paramLong as string) as unknown as number;
  const latitude = (paramLat as string) as unknown as number;
  const lastStocked = paramLastStocked as string;
  const stockingFreq = paramStockingFreq as string;
  const knownCats = paramCats as string;
  const isStocked = paramStocked === "true";

  return (
    <SafeAreaView style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.navigate('/stations')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {isAdmin ? <Button style={buttonStyles.editButton} onPress={() => router.push({
        pathname: '/stations/edit-station',
        params: { paramId:id, paramName:name, paramLong:paramLong, paramLat:paramLat, paramLastStocked:paramLastStocked, paramCats:knownCats, paramStockingFreq:paramStockingFreq },
      })}>
        <Text style ={textStyles.editText}> Edit Station</Text>
      </Button> : null}
      <StationEntry
          key={id}
          id={id}
          name={name}
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