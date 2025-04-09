import { SafeAreaView, ScrollView, Text } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, CatalogEntry, IconButton } from '@/components';
import { useAuth } from '@/providers';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const view_entry = () =>{
  const { user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const router = useRouter();

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.navigate('/catalog')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      
      <ScrollView contentContainerStyle={[containerStyles.scrollView, {paddingTop:'10%'}]}>
      <CatalogEntry/>
      </ScrollView>
      {isAdmin ? <Button style={buttonStyles.bigButton} onPress={() => router.push('/catalog/edit-entry')}>
        <Text style ={textStyles.editText}> Edit Entry</Text>
      </Button> : null}
      
    </SafeAreaView>
  );
}
export default view_entry;