import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AnnouncementEntry, Button } from '@/components';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const ViewAnn = () => {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button
        style={buttonStyles.smallButtonTopLeft}
        onPress={() => router.navigate('/announcements')}
      >
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <ScrollView
        contentContainerStyle={[
          containerStyles.scrollView,
          { paddingTop: '10%' },
        ]}
      >
        <AnnouncementEntry />
      </ScrollView>
      {isAdmin ? (
        <Button onPress={() => router.push('/announcements/edit-ann')}>
          Edit Announcement
        </Button>
      ) : null}
    </SafeAreaView>
  );
};
export default ViewAnn;
