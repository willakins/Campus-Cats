//Common styles
import { StyleSheet } from 'react-native';

const globalStyles = StyleSheet.create({
    tabs: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: '#333',
    },
    lockIcon: {
      marginRight: 15, // Adjust as needed for positioning
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
      backgroundColor: "#fff", // Set the notch area color
    },
});
export { globalStyles };