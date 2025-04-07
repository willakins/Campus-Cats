import { SafeAreaView, ScrollView, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { Button } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { WhitelistApp } from '@/types';
import { WhitelistItem } from '@/components/items/WhitelistItem';
import { Snackbar } from 'react-native-paper';

const ManageWhitelist = () => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const [visible, setVisible] = useState<boolean>(false);
  const [applicants, setApplicants] = useState<WhitelistApp[]>([]);

  useEffect(() => {
    database.fetchWhitelist(setApplicants);
  }, []);

  return (
    <SafeAreaView style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>

      <Text style={textStyles.title}>View Whitelist Applications</Text>

      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {applicants.map((app) => (
          <WhitelistItem 
            key={app.id} 
            app={app}
            setApps={setApplicants}
            setVisible={setVisible}/>
        ))}
      </ScrollView>
      <Snackbar visible={visible} onDismiss={() => setVisible(false)}>
        Saving...
      </Snackbar>
    </SafeAreaView>
  );
};

export default ManageWhitelist;
