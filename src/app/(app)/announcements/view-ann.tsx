import { SafeAreaView, ScrollView, Text } from 'react-native';

import { useRouter } from 'expo-router';

import { AnnouncementEntry, BackButton, Button } from '@/components';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const ViewAnn = () => {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <BackButton />
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
