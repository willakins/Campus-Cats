import { KeyboardAvoidingView, Platform  } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection } from 'firebase/firestore';

import { Button } from '@/components';
import { db } from '@/config/firebase';
import { SightingReportForm } from '@/forms';
import { Sighting, sightingPath } from '@/models';
import { buttonStyles, containerStyles } from '@/styles';

const CatReportScreen = () => {
  const router = useRouter();

  const handleSubmit = async (data: Sighting) => {
    console.log("here0");
    console.log(data);
    await addDoc(collection(db, sightingPath), data);
    console.log("here1");
    router.push('/(app)/(tabs)')
  };

  return (
    <KeyboardAvoidingView
      style={containerStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/(app)/(tabs)')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SightingReportForm type="create" onSubmit={handleSubmit} />
    </KeyboardAvoidingView>
  );
};
export default CatReportScreen;
