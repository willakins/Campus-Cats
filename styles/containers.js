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
        marginBottom: 20, // Space between catalog entries
        padding: 5,
        borderRadius:10,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    entryElements: {
        flexDirection: "column", // Ensures each item is stacked vertically
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
        width: 250,
        height: 250,
        marginBottom: 20,
    },
    extraPic: {
        width: 100,
        height: 100,
        borderRadius: 10,
    },
    headlineImage: {
        width: 400,  // Set a fixed width for the profile picture
        height: 250, // Set a fixed height for the profile picture
        borderRadius: 60,  // Makes the image circular
        marginTop: 10,
        paddingHorizontal: 20,
    },
    listImage: {
        width: 250, // Set a fixed width for the image
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
    },
    splashImage: {
        width: 200,
        height: 200,
    },
    mapContainer: {
        width: '100%', 
        height: 200, 
        paddingHorizontal: 15, 
        borderRadius:10,
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
    },
    loginInputContainer: {
        width: '80%',
        backgroundColor: '#f9f9f9',
        padding: 20,
        borderRadius: 10,
        elevation: 3,  // Adds shadow on Android
        shadowColor: '#000',  // Adds shadow on iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    input: {
        height: 40,
        width: 300,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 15,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
        color: '#000',
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
    dateInput: {
        height: 40,
        width: 300,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 15,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
        flexDirection: 'row', 
    },
});
export { containerStyles };