//Button styles
import { StyleSheet } from 'react-native';

const buttonStyles = StyleSheet.create({
  editButton: {
      position: 'absolute',
      top: 20,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#333',
      padding: 5,
      borderRadius: 5,
      zIndex: 10, // Ensure the logout button is on top
  },
  deleteButton: {
    backgroundColor: 'red',
    padding: 5,
    borderRadius: 5,
    marginTop: 5,
  },
  deleteButton2: {
    backgroundColor: '#0b6623',
    padding: 5,
    borderRadius: 5,
    marginTop: 5,
  },
  deleteButton3: {
    backgroundColor: '#0492c2',
    padding: 5,
    borderRadius: 5,
    marginTop: 5,
  },
  dateButton: {
    backgroundColor: '#0b6623',
    padding: 5,
    borderRadius: 5,
    marginTop: 5,
  },
  iconButton: {
    backgroundColor: '#333',
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButton: {
    position: 'absolute', // Position the button absolutely
    bottom: 20,           // Adjust distance from the bottom of the screen
    alignSelf: 'center',
    backgroundColor: '#007bff', // Button background color
    paddingVertical: 10,  // Vertical padding
    paddingHorizontal: 20, // Horizontal padding
    borderRadius: 5,      // Rounded corners
    elevation: 5,         // Shadow for Android
    shadowColor: '#000',  // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.5,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    marginVertical: 0,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  activeButton: {
    backgroundColor: '#007bff'
  },
  logoutButton: {
    position: 'absolute',
    top: 10,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 5,
    borderRadius: 5,
    zIndex: 10, // Ensure the logout button is on top
  },
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    margin: 5,
    display: 'flex',
    justifyContent: 'center',
  },
  refillButton: {
    backgroundColor: '#333', /* Green color for a fresher, more inviting look */
    paddingVertical: 12, /* More consistent vertical padding */
    paddingHorizontal: 24, /* Added horizontal padding for a better balance */
    borderRadius: 30, /* More rounded edges */
    alignItems: 'center',
    justifyContent: 'center',
    width: '50%', /* Button takes up 50% of the container width */
    margin: 10, /* Increased margin for better spacing */
    display: 'flex',
    elevation: 5, /* Add a subtle shadow effect for a 3D look */
    shadowColor: '#000', /* Shadow color for iOS */
    shadowOffset: { width: 0, height: 4 }, /* Shadow offset for iOS */
    shadowOpacity: 0.1, /* Slight shadow for a soft look */
    shadowRadius: 6, /* Radius for the shadow */
  },
  profileButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  cameraButton: {
    width: 70,  // Width of the circle
    height: 70, // Height of the circle (same as width to make it circular)
    borderRadius: 35, // Half of width/height to make it circular
    backgroundColor: '#333', // Button color (blue)
    justifyContent: 'center', // Center the icon vertically
    alignItems: 'center', // Center the icon horizontally
    elevation: 5,  // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.5,
    paddingVertical: 10,  // Vertical padding
    paddingHorizontal: 20, // Horizontal padding
  },
  imageButton: {
    backgroundColor: '#333',
    borderRadius: 10,
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
  button2: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30, 
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10, 
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  }
});
export { buttonStyles };
