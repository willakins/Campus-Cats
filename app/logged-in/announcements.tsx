import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native';

const Announcements = () => {
  const shouldShowLockIcon = true;
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Announcements Screen</Text>
      {shouldShowLockIcon ? (
                <Ionicons
                  name="lock-closed"
                  size={24}
                  color="black"
                  style={styles.lockIcon}
                />
              ) : null}
    </View>
  );
}

export default Announcements;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 15, // Adjust as needed for positioning
  },
});