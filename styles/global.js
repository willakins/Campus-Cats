//Common styles
import { StyleSheet } from 'react-native';

const globalStyles = StyleSheet.create({
    tabs: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: '#333',
    },
    lockIcon: {
      position: 'absolute',
      top: 10,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 5,
      borderRadius: 5,
      zIndex: 10,
    },
    homeScreen: {
      flex: 1,
      justifyContent: 'center',
    },
    screen: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    safeView: {
      flex: 1,
      backgroundColor: "#ccc", // Set the notch area color
      marginBottom:-40,
    },
});
export { globalStyles };