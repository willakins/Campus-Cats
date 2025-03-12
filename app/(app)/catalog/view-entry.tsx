import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, CatalogEntry } from '@/components';
import { useAuth } from '@/providers';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const view_entry = () =>{
  const { signOut, user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const router = useRouter();
  const { paramId, paramName, paramInfo } = useLocalSearchParams();
  const id = paramId as string;
  const name = paramName as string;
  const info = paramInfo as string;

  return (
    <SafeAreaView style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.navigate('/catalog')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {isAdmin ? <Button style={buttonStyles.editButton} onPress={() => router.push({
        pathname: '/catalog/edit-entry',
        params: { paramId:id, paramName:name, paramInfo:info },
      })}>
        <Text style ={textStyles.editText}> Edit Entry</Text>
      </Button> : null}
      <CatalogEntry
          id={id}
          name={name}
          info={info}
        />
    </SafeAreaView>
  );
}
export default view_entry;