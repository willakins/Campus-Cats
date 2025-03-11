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
    reportButton: {
        position: 'absolute', // Position the button absolutely
        bottom: 20,           // Adjust distance from the bottom of the screen
        left: '57%',          // Center horizontally
        transform: [{ translateX: -75 }], // Offset to make the button centered (since width is 150)
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
});
export { buttonStyles };