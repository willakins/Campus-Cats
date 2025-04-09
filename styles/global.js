//Common styles
import { Platform, StyleSheet } from 'react-native';

const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
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
  safeView: { // Controls the SafeAreaView over the entire app
    flex: 1,
    backgroundColor: "#ccc", // Set the notch area color
    marginBottom: Platform.select({
      ios: -40, // avoid iOS extra space on bottom
      default: 0
    }),
  },
});
export { globalStyles };
