//Container styles
import { Platform, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - 32; // leaving 16px padding on both sides

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
    height: '5%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#000',
    justifyContent: 'center',
    textAlign: 'left',
    flex: 1,
  },
  descInputContainer: {
    padding:10,
    width: '100%',
    height: '10%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#000',
    textAlign: 'left',
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
    height: 200,
    borderRadius: 22, // soft corners
    marginBottom: 16,
    alignSelf: 'center',
    overflow: 'hidden', // ensures the rounded corners are clipped
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
  snackbarContainer: {
    position: 'absolute',
    top: '15%',
    left: '3%',
    right: '3%',
    zIndex: 1000,  // Ensure the snackbar is above other content
  },
  snackbar: {
    width: '100%',
    height: '20%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    borderRadius: 5,
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  listCard: {
    flexDirection: 'row', // Row layout for image and text
    padding: 16, // Padding inside the card for spacing
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center', // Center content vertically
    justifyContent: 'flex-start', // Align the items starting from the left
  },
  cardImage: {
    width: 150, // Set image width
    height: 150, // Set image height
    borderRadius: 12, // Rounded corners for the image
    marginRight: 16, // Space between image and details
  },
  statusContainer: {
    flexDirection: 'row', // Align the status text and checkbox horizontally
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'space-between', // Ensure they are spaced evenly
  },
  
  listDetails: {
    flexDirection: 'column',
    paddingLeft: '25%',
    width: 150,
    hieght: 150, // Stack details vertically
    flex: 1, // Take up the remaining space in the row
    justifyContent: 'space-between', // Space out the details vertically
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
export { containerStyles };
