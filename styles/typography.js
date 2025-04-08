//Text styles
import { StyleSheet } from 'react-native';

const textStyles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: '5%',
  },
  catalogTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5, // Space between title and description
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
    flexShrink: 1,
    color: '#333',
  },
  headline: {
    fontSize: 20,
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'left',
  },
  headline2: {
    fontSize: 20,
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subHeading: {
    fontSize: 15,
    color: '#000',
    textAlign: 'center',
    marginBottom: 0
  },
  stationText1: {
      fontSize: 15,
      color: 'red',
      textAlign: 'center',
      padding: 30,
  },
  stationText2: {
      fontSize: 20,
      color: 'green',
      textAlign: 'center',
      padding:30,
  },
  normalText: {
    fontSize: 16,
    color: '#333',
  },
  contactInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    padding: 5,
  },
  subHeading2: {
    fontSize: 15,
    color: '#000',
    textAlign: 'left',
    marginBottom: 0
  },
  logoutText: {
    color: '#fff',
    marginLeft: 5,
  },
  errorText: {
    color: 'red',
    fontSize: 10,
  },
  editText: {
    color: '#fff',
    marginLeft: 0,
  },
  dateText: {
    fontSize: 15,
    color: '#000',
    textAlign: 'center',
    marginTop: 10
  },
  activeText: {
    color: '#fff'
  },
  buttonText: {
    fontSize: 18,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sliderText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
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
  forgotPassword: {
    marginTop: 10,
    color: '#007BFF',
    textAlign: 'center',
  },
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
    paddingTop: 30,
    color: '#333',
    textAlign: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: '5%',
  },
  label2: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  detail: {
    fontSize: 16,
    color: '#555',
    marginVertical: 4,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
  },
  statusText2: {
    fontSize: 14,
    fontWeight: '500',
  },
  knownCats: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
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
