//Container styles
import { StyleSheet } from 'react-native';

const containerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F9',
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  scrollView: {
    padding: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F9',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#f0f0f0'
  },
  homeContainer: {
    flex: 1,
  },
  cameraView: {
    alignItems: 'center',
    paddingVertical: 20,  // Vertical padding
  },
  selectedPreview: {
    margin: 'auto', // Center the image
    objectFit: 'scale-down', // Don't clip the image
    width: 240,
    height: 180,
  },
  entryContainer: {
    flexDirection: 'column', // Stack items vertically
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    padding: 15,
    borderRadius:10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    width:'100%'
  },
  userContainer: {
    flexDirection: 'column', // Stack items vertically
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    padding: 15,
    borderRadius:10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    width:'95%',
    margin:10
  },
  row: {
    marginBottom: 20,
    marginTop:20,
  },
  contactContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    position: 'relative',
    marginTop:50
  },
  entryElements: {
    flexDirection: "column", // Ensures each item is stacked vertically
    alignItems: "center",
  },
  entryRowElements: {
    flexDirection: "row", // Ensures each item is stacked vertically
    alignItems: "center",
  },
  extraPicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  imageWrapper: {
    alignItems: 'center',
    margin: 10,
  },
  logo: {
    height: '40%',
    width: '80%',
    resizeMode: 'contain',
    marginBottom: 20,
    borderRadius:50,
    aspectRatio: 1
  },
  extraPic: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  headlineImage: {
    width: '100%',  // Set a fixed width for the profile picture
    height: 250, // Set a fixed height for the profile picture
    borderRadius: 60,  // Makes the image circular
    marginTop: 10,
    paddingHorizontal: 20,
  },
  extraImage: {
    width: '100%',  // Set a fixed width for the profile picture
    height: 250, // Set a fixed height for the profile picture
    borderRadius: 200,  // Makes the image circular
    marginTop: 10,
    paddingHorizontal: 20,
  },
  listImage: {
    width: 250, // Set a fixed width for the image
    height: 150, // Set a fixed height for the image
    borderRadius: 40, // Make the image circular
    marginBottom: 10, // Space between image and text
  },
  listImage2: {
    width: 200, // Set a fixed width for the image
    height: 150, // Set a fixed height for the image
    borderRadius: 40, // Make the image circular
    marginBottom: 10, // Space between image and text
  },
  catImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    justifyContent: 'center',
    textAlign: 'center',
    flex: 1,
    marginBottom: 15,
  },
  splashImage: {
    width: 200,
    height: 200,
  },
  mapContainer: {
    width: '100%', 
    height: 200, 
    paddingHorizontal: 5, 
    borderRadius:10,
    marginTop: 10,
    marginBottom: 10,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 3,  // Adds shadow on Android
    shadowColor: '#000',  // Adds shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderRadius:10,
  },
  loginContainer: {
    width: '80%',
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 10,
    elevation: 3,  // Adds shadow on Android
    shadowColor: '#000',  // Adds shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    margin:10,
  },
  profileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  item: {
    backgroundColor: '#f9c2ff',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  picker: {
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'center',
  },
  dateInput: {
    height: 70,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom:10,
    padding:15,
    backgroundColor: '#fff',
    flexDirection: 'row', 
    elevation: 3,  // Adds shadow on Android
    shadowColor: '#000',  // Adds shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stationsEntry: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white", // Ensure background is set
    padding: 10,
  },
  checkboxContainer: {
    borderWidth: 2, // Thickness of the box
    borderColor: "black", // Box color
    padding: 5, // Space between the checkbox and the box edges
    borderRadius: 5, // Rounded corners
  },
  stockContainer: {
    flex: 1,
    alignItems:"center",
    paddingTop: 20,
    paddingHorizontal: 15,
  },
});
export { containerStyles };
