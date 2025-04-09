//Text styles
import { StyleSheet } from 'react-native';

const textStyles = StyleSheet.create({
  /** Titles */
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    alignSelf: 'center',
    marginTop:15,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  listTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginTop:15,
  },
  /** Headers */
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: '5%',
  },
  /** Main Text */
  detail: {
    fontSize: 16,
    color: '#555',
    marginVertical: 4,
  },
  footerText: {
    fontSize: 13,
    color: '#888',
  },
  /** Button Text */
  smallButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonText: {
    fontSize: 18,
  },
  bigButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  /** Misc. */
  dateText: {
    fontSize: 15,
    color: '#000',
    textAlign: 'center',
    marginTop: 10
  },
  activeText: {
    color: '#fff'
  },
  /** Input text */
  input: {
    fontSize:15,
    fontWeight: '600',
    color: '#1A1A1A',
    width: '100%',
  },
  descInput: {
    fontsize:15,
    color: '#555',
    width: '100%',
    fontWeight: 'light',
    color: '#000',
  },
});
export { textStyles };