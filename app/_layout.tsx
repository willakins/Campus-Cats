import { Slot } from 'expo-router';

import { AuthProvider } from '@/providers';
import { SafeAreaView, StyleSheet } from 'react-native';

const RootLayout = () => {
  return (
    <SafeAreaView style = {styles.safeView}>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </SafeAreaView>
    
  );
};

export default RootLayout;

const styles = StyleSheet.create({
  safeView: {
    flex: 1,
    backgroundColor: "#fff", // Set the notch area color
  }
});
