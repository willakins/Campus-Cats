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
  const { paramId, paramTitle, paramInfo, paramPhotos, paramCreated } = useLocalSearchParams();
  const id = paramId as string;
  const title = paramTitle as string;
  const info = paramInfo as string;
  const photos = paramPhotos as string;
  const createdAt = paramCreated as string;

  return (
    <SafeAreaView style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.navigate("/announcements")}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {isAdmin ? <Button style={buttonStyles.editButton} onPress={() => router.push({
        pathname: '/announcements/edit-ann',
        params: { paramId:id, paramTitle:title, paramInfo:info, paramPhotos, paramCreated },
      })}>
        <Text style ={textStyles.editText}> Edit Announcement</Text>
      </Button> : null}
      <AnnouncementEntry
        id={id}
        title={title}
        info={info}
        photos={photos}
        createdAt={createdAt}
      />
    </SafeAreaView>
  );
}
export default view_entry;