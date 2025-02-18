# Campus Cats

**Campus Cats** is a mobile app for Georgia Tech’s Campus Cats club, enabling users to report cat sightings, upload photos, chat with members, and access information about campus cats. The app aims to foster communication and engagement within the Campus Cats community while helping track and care for stray cats on campus.

# Release Notes

## Version 0.2.0

### Features

The second release introduces enhancements to usability and functionality, improving the experience for users. Key updates include:

- **Cat Reporting Capabilities:** Users can now upload pictures in a cat sighting report, marking their name, condition, and location! Furthermore, admin users may edit each sighting.
- **Cat Sighting Map:** Created a map with pins representing the location of sightings, and provided a filtering option based on time.
- **Make Admins:** Admins can now make new admins.
- **Improved UI & UX:** Revamped design for a more intuitive experience and improved performance by reducing the number of network queries necessary.

### Bug Fixes

- Fixed permissions issue when the user tries to select a photo for the report. Previously, this caused the selection to fail silently.
- Disable back navigation from the home screen. Previously, this allowed android and web users to return to the login screen without logging out.
- Show status bar on Android. Due to rendering differences between platforms, different stylings are required.

### Known Issues

- The filtering system does not yet support multi-criteria selection.
- On Android, the login button requires two clicks to login.
- Some users may encounter authentication errors due to not being properly synced in the backend.
- Attempting to navigate back from a submenu of the settings page redirects to the home page instead of the settings page.


## Version 0.1.0

### Features
The second release introduces enhancements to usability and functionality, improving the experience for users. Key updates include:

- **Splash Screen**: Added a welcoming splash screen to enhance the user experience during app launch.
- **Account Creation**: Began work on enabling users to create accounts for personalized app usage.
- **Firebase Storage Integration**: Photos taken in the app are uploaded seamlessly to Firebase Storage.
- **UI Framework**: Initial setup of the login screen and navigation bar, including tabs for the map, announcements, camera, chat, and catalog. Add color & text to make it the interface more appealing. 

### Bug Fixes
- Addressed a bug that caused duplicate entries in the Cat-alog for some uploads.
- Resolved an issue where the button was only clickable on the text, making the entire button area clickable.

### Known Issues
- Photos uploaded from the gallery are not yet geotagged. This feature is planned for a future release.
- Users cannot edit metadata or captions for their uploaded photos.
- Push notifications for updates or new sightings are still under development.
- The authentication doesn't work with IOS/Android (don't have the packages yet)
- Requesting permissions for camera only work on web browser, not on IOS/Android
- Firebase API key is hardcoded, and Firebase security currently allows all
reads and write (time limited).


## Version 0.0.0

### Features
For the first version of the app, we have implemented the "Cat-alog" feature. Users can take photos of cats they encounter, and these photos are then uploaded to Firebase storage and displayed in a catalog showing all previously sighted cats. We have chosen this feature to showcase our database implementation and how it works with the primary use case for our app -- cataloging cat sightings.

- **Camera Screen**: Users can capture photos of cats directly within the app.
- **Firebase Storage Integration**: Photos taken in the app are uploaded to Firebase Storage.
- **Cat-alog Screen**: Displays photos of all uploaded cat sightings in a scrolling catalog
- **UI Framework**: Login screen and navbar including the map, announcements, camera, chat, and catalog

### Bug Fixes
- N/A

### Known Issues
- The app currently does not support uploading existing photos. Photos can only be uploaded through using the in-app camera screen.
- There is no way to delete or edit photos. After taking, they are immediately uploaded to firebase and displayed in the catalog.

# Technology Stack

- **Frontend**: React Native (for cross-platform support on iOS and Android)
- **Backend**: NodeJS (for scalable server-side logic)
- **Database**: Firebase (for simple and secure storage of photos and data)
- **Additional Services**: Google Maps API (planned for future releases for map-based cat sightings)
