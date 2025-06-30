//Text styles
import { Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

const textStyles = StyleSheet.create({
  pageTitle: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: height * 0.02,
  },
  lowerPageTitle: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: height * 0.06,
  },
  cardTitle: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  listTitle: {
    fontSize: width * 0.06,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: width * 0.055,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginTop: height * 0.02,
  },
  label: {
    fontSize: width * 0.045,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: height * 0.01,
  },
  detail: {
    fontSize: width * 0.04,
    color: '#555',
    marginVertical: height * 0.005,
  },
  footerText: {
    fontSize: width * 0.035,
    color: '#888',
  },
  smallButtonText: {
    color: 'white',
    fontSize: width * 0.03,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonText: {
    fontSize: width * 0.045,
  },
  bigButtonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: width * 0.038,
    color: '#000',
    textAlign: 'center',
    marginTop: height * 0.015,
  },
  activeText: {
    color: '#fff',
  },
  input: {
    fontSize: width * 0.04,
    fontWeight: '600',
    color: '#1A1A1A',
    width: '100%',
  },
  descInput: {
    fontSize: width * 0.04,
    color: '#000',
    width: '100%',
    fontWeight: '300',
  },
});
export { textStyles };
