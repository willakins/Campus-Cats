//Text styles
import { StyleSheet } from 'react-native';

const textStyles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 40,
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
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5, // Space between title and description
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
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'left',
    padding: 10,
  },
  input: {
    height: 40,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#000',
  },
  descInput: {
    height: 120,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#000',
    elevation: 3,  // Adds shadow on Android
    shadowColor: '#000',  // Adds shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
});
export { textStyles };
