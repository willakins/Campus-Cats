import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, CatalogEntryElement } from '@/components';
import { useAuth } from '@/providers';
import {
  buttonStyles,
  containerStyles,
  globalStyles,
  textStyles,
} from '@/styles';

const view_entry = () => {
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
        <Button
          style={buttonStyles.bigButton}
          onPress={() => router.push('/catalog/edit-entry')}
        >
          <Text style={textStyles.bigButtonText}> Edit Entry</Text>
        </Button>
      ) : null}
    </SafeAreaView>
  );
};
export default view_entry;
