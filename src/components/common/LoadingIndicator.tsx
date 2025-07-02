import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { globalStyles } from '@/styles';

export const LoadingIndicator = () => {
  return (
    <View style={globalStyles.screen}>
      <ActivityIndicator size="large" color="#000" />
    </View>
  );
};
