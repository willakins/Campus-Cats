import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { BackButton, SnackbarMessage } from '@/components';
import { WhitelistItem } from '@/components/items/WhitelistItem';
import DatabaseService from '@/services/DatabaseService';
import { containerStyles, textStyles } from '@/styles';
import { WhitelistApp } from '@/types';

const ManageWhitelist = () => {
  const database = DatabaseService.getInstance();
  const [visible, setVisible] = useState<boolean>(false);
  const [applicants, setApplicants] = useState<WhitelistApp[]>([]);

  useEffect(() => {
    void database.fetchWhitelist(setApplicants);
    // NOTE: database is a singleton class provided by DatabaseService and
    // will never change; it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <BackButton />
      <SnackbarMessage
        text="Saving Whitelist..."
        visible={visible}
        setVisible={setVisible}
      />
      <Text style={textStyles.pageTitle}>View Whitelist Applications</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {applicants.map((app) => (
          <WhitelistItem
            key={app.id}
            app={app}
            setApps={setApplicants}
            setVisible={setVisible}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ManageWhitelist;
