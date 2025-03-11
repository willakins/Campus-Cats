import React from 'react';
import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

import { LoadingIndicator } from '@/components';
import { useAuth } from '@/providers';

const Announcements = () => {
  const { user, loading } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={globalStyles.screen}>
      <Text>Announcements Screen</Text>
      {isAdmin ? (
        <Ionicons
          name="lock-closed"
          size={24}
          color="black"
          style={globalStyles.lockIcon}
        />
      ) : null}
    </View>
  );
};
export default Announcements;