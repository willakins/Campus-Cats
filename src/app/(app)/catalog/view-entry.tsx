import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { BackButton, Button, CatalogEntryElement } from '@/components';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const ViewEntry = () => {
  const { user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const router = useRouter();

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <BackButton />
      <ScrollView
        contentContainerStyle={[
          containerStyles.scrollView,
          { paddingTop: '10%' },
        ]}
      >
        <CatalogEntryElement />
      </ScrollView>
      {isAdmin ? (
        <Button onPress={() => router.push('/catalog/edit-entry')}>
          Edit Entry
        </Button>
      ) : null}
    </SafeAreaView>
  );
};
export default ViewEntry;
