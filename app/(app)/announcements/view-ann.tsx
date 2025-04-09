import { SafeAreaView, ScrollView, Text } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, AnnouncementEntry } from '@/components';
import { useAuth } from '@/providers';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const view_entry = () =>{
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  
  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.navigate('/announcements')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <ScrollView contentContainerStyle={[containerStyles.scrollView, {paddingTop:'10%'}]}>
      <AnnouncementEntry/>
      </ScrollView>
      {isAdmin ? <Button style={buttonStyles.bigButton} onPress={() => router.push('/announcements/edit-ann')}>
        <Text style ={textStyles.bigButtonText}> Edit Announcement</Text>
      </Button> : null}
    </SafeAreaView>
  );
}
export default view_entry;