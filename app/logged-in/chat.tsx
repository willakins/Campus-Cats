import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native';

const Chat = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Chat Screen</Text>
    </View>
  );
}

export default Chat;

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