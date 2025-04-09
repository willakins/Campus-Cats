//Text styles
import { StyleSheet } from 'react-native';

const textStyles = StyleSheet.create({
  /** Titles */
  catalogTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  announcementTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    paddingTop: '15%',
  },
  stationTitle: {
    fontSize: 18,
    fontWeight: '600',
    flexShrink: 1, // Allow text to shrink if necessary
    color: '#333',
  },
  /** Headers */
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: '5%',
  },
  sliderText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  /** Main Text */
  detail: {
    fontSize: 16,
    color: '#555',
    marginVertical: 4,
  },
  /** Input */
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
  /** Misc */
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
  /** idk */
  description: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginHorizontal: 10, // Add some horizontal padding for better readability
    marginBottom: 20,
    marginTop: -20,
  },
  catalogDescription: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginHorizontal: 10, // Add some horizontal padding for better readability
  },
  announcementDescription: {
    fontSize: 18,
    color: '#777',
    textAlign: 'left',
    marginHorizontal: 10, // Add some horizontal padding for better readability
  },
  catalogInput: {
    height: 40,
    width: '100%',
    //borderColor: '#ccc',
    //borderWidth: 1,
    //borderRadius: 5,
    //marginBottom: 15,
    //paddingHorizontal: 10,
    //backgroundColor: '#fff',
    color: '#000',
  },
  catalogDescInput: {
    height: 50,
    width: '100%',
    //borderColor: '#ccc',
    //borderWidth: 1,
    //borderRadius: 5,
    //marginBottom: 15,
    //paddingHorizontal: 10,
    //backgroundColor: '#fff',
    color: '#000',
    //elevation: 3,  // Adds shadow on Android
    //shadowColor: '#000',  // Adds shadow on iOS
    //shadowOffset: { width: 0, height: 2 },
    //shadowOpacity: 0.1,
    //shadowRadius: 4,
  },
  catalogLongDescription: {
    fontSize: 14,
    color: '#777',
    textAlign: 'left',
    marginHorizontal: 10, // Add some horizontal padding for better readability
  },
  bigButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  titleCentered: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  loading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    alignSelf:'center',
  },
  /** Use this stuff */
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: '5%',
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  
  statusText: {
    fontSize: 16,
    color: '#333',
  },
  statusText2: {
    fontSize: 14,
    fontWeight: '500',
  },
  normalText: {
    fontSize: 16,
    color: '#555',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginRight: 10,
  },
  picker: {
    height: 30,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  footerText: {
    fontSize: 13,
    color: '#888',
  },
});
export { textStyles };
