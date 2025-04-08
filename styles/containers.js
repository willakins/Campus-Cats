//Container styles
import { Platform, StyleSheet } from 'react-native';

const containerStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F4F9',
        padding: 20,
        paddingHorizontal: 15,
    },
    scrollView: {
        paddingTop: 20, 
        paddingBottom: 40 
    },
    scrollView2: {
        padding:10,
        alignItems: 'center',
        justifyContent: 'center',
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
    entryElements2: {
      flexDirection: "column", // Ensures each item is stacked vertically
      alignItems: "center",
      padding: '10%',
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
    logo: {
        height: '40%',
        width: '80%',
        marginBottom: 20,
        borderRadius:50,
        aspectRatio: 1
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
  inputContainer2: {
    padding:10,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#000',
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
  picker: {
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'center',
  },
  dateInput: {
    height: 70,
    width: '100%',
    padding:15,
    flexDirection: 'row', 
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#000',
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
  announcementDetails: {
    fontSize: 15,
    color: '#000',
    textAlign: 'left',
    marginTop: 0,
  },
  catalogInputContainer: {
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
  catalogEntryContainer: {
    flexDirection: 'column', // Stack items vertically
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    padding: 15,
    borderRadius:10,
    //backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    width:'100%'
  },
  wrapper: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: '10%',
  },
  card: {
    padding: '5%',
    backgroundColor: '#fff',
    borderRadius: '4%',
    marginHorizontal: '3%',
    marginBottom: '5%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  block: {
    marginTop: 10,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginVertical: 10,
    overflow: 'hidden',
  },
  imageMain: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
  },
  sectionRow: {
    flexDirection: 'column',
    gap: 12,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkWrap: {
    marginLeft: 8,
  },
  formSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  cameraView: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },

  imageWrapper: {
    position: 'relative',
    margin: 5,
    alignItems: 'center',
  },

  extraPic: {
    width: 100,
    height: 100,
    borderRadius: 12,
    resizeMode: 'cover',
  },

  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    marginTop: 10,
  },

  mapContainer: {
    height: 200,
    width: '100%',
    borderRadius: 12,
    marginBottom: 12,
  },
  safeContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
    backgroundColor: '#f9f9f9',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 32,
    paddingHorizontal: 16,
    gap: 16,
    alignItems: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
  },
  snackbar: {
    width: '100%',
    heigh: '100%',  // You can adjust this width based on your design
    backgroundColor: 'rgba(0, 0, 0, 0.8)',  // Optional: Style the snackbar
    color: 'white',
    borderRadius: 5,  // Optional: Add border radius to the snackbar
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
});
export { containerStyles };
