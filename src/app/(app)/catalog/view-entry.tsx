import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, CatalogEntryElement } from '@/components';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const ViewEntry = () => {
  const { user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const router = useRouter();

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button
        style={buttonStyles.smallButtonTopLeft}
        onPress={() => router.navigate('/catalog')}
      >
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>

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
