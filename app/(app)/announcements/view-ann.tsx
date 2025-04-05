import { SafeAreaView, Text } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, AnnouncementEntry } from '@/components';
import { useAuth } from '@/providers';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const view_entry = () =>{
  const { signOut, user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const router = useRouter();
  const { id, title, info, createdAt, createdBy } = useLocalSearchParams() as {id:string, title:string, info:string, createdAt:string, createdBy:string};
  
  return (
    <SafeAreaView style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.navigate("/announcements")}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {isAdmin ? <Button style={buttonStyles.editButton} onPress={() => router.push({
        pathname: '/announcements/edit-ann',
        params: { id:id, title:title, info:info, createdAt:createdAt, createdBy:createdBy },
      })}>
        <Text style ={textStyles.editText}> Edit Announcement</Text>
      </Button> : null}
      <AnnouncementEntry
        id={id}
        title={title}
        info={info}
        createdAt={createdAt}
        createdBy={createdBy}
      />
    </SafeAreaView>
  );
}
export default view_entry;