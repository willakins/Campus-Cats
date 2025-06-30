import { Dimensions, Platform, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');
const vw = width / 100;
const vh = height / 100;

const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
  },
  lockIcon: {
    position: 'absolute',
    top: vh * 1.2,
    right: vw * 5,
    flexDirection: 'row',
    alignItems: 'center',
    padding: vw * 1.2,
    borderRadius: vw * 1.2,
    zIndex: 10,
  },
  safeView: {
    flex: 1,
    backgroundColor: '#E5E5E5',
    marginBottom: Platform.select({
      ios: -vh * 5, // avoid iOS extra space on bottom
      default: 0,
    }),
  },
});
export { globalStyles };
