import { useCallback, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button, SnackbarMessage } from '@/components';
import { WhitelistItem } from '@/components/items/WhitelistItem';
import { appModules } from '@/composition/appModules';
import { WhitelistApplication, parseUser } from '@/core/domain';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const ManageWhitelist = () => {
  const router = useRouter();
  const { user } = useAuth();
  const actor = parseUser(user);
  const [visible, setVisible] = useState(false);
  const [applications, setApplications] = useState<
    readonly WhitelistApplication[]
  >([]);

  const load = useCallback(() => {
    void appModules.whitelist.list(actor).then((result) => {
      if (result.ok) setApplications(result.value);
      else Alert.alert('Could not load applications', result.error.message);
    });
  }, [actor.id]);
  useFocusEffect(load);

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage
        text="Saving Whitelist..."
        visible={visible}
        setVisible={setVisible}
      />
      <Text style={textStyles.pageTitle}>View Whitelist Applications</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {applications.map((application) => (
          <WhitelistItem
            key={application.id}
            actor={actor}
            application={application}
            onChanged={load}
            setBusy={setVisible}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ManageWhitelist;
