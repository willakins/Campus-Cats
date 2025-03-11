import { Text, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, CatalogEntry } from '@/components';
import { useAuth } from '@/providers';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { AnnouncementEntry } from '@/components';

const view_entry = () =>{
  const { signOut, user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const router = useRouter();
  const { paramId, paramTitle, paramInfo, paramPhotos } = useLocalSearchParams();
  const id = paramId as string;
  const title = paramTitle as string;
  const info = paramInfo as string;
  const photos = paramPhotos as string[];

  return (
    <View>
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/announcements')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {isAdmin ? <Button style={buttonStyles.editButton} onPress={() => router.push({
        pathname: '/catalog/edit-entry',
        params: { paramId:id, paramTitle:title, paramInfo:info },
      })}>
        <Text style ={textStyles.editText}> Edit Announcement</Text>
      </Button> : null}
      <AnnouncementEntry
        id={id}
        title={title}
        info={info}
        photos={photos}
      />
    </View>
  );
}
export default view_entry;