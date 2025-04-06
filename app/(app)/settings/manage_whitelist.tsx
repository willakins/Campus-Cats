import { SafeAreaView, ScrollView, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { Button } from '@/components';
import { UserItem } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { User } from '@/types';

const ManageWhitelist = () => {
  const router = useRouter();
  const [applicants, setApplicants] = useState<User[]>([]);
  const database = DatabaseService.getInstance();

  useEffect(() => {
    database.fetchApplications(setApplicants);
  }, []);

  return (
    <SafeAreaView style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>

      <Text style={textStyles.title}>View Whitelist Applications</Text>

      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {applicants.map((app) => (
          <UserItem key={app.id} user={user} setUsers={setnotGTUsers} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ManageWhitelist;
