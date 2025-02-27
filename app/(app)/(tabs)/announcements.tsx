import React from 'react';
import { Text, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { LoadingIndicator } from '@/components';
import { useAuth } from '@/providers';

const Announcements = () => {
  const { user, loading } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Announcements Screen</Text>
      {isAdmin ? (
        <Ionicons
          name="lock-closed"
          size={24}
          color="black"
          style={styles.lockIcon}
        />
      ) : null}
    </View>
  );
};

export default Announcements;

const styles = StyleSheet.create({
  lockIcon: {
    marginRight: 15, // Adjust as needed for positioning
  },
});
