# Campus Cats

**Campus Cats** is a mobile app for Georgia Tech’s Campus Cats club, enabling users to report cat sightings, upload photos, chat with members, and access information about campus cats. The app aims to foster communication and engagement within the Campus Cats community while helping track and care for stray cats on campus.

# Release Notes

## Version 1.0.0

# New Software Features

## Primary Features

- **Cat Reporting Capabilities:** Users can now upload pictures in a cat sighting report, marking their name, condition, and location!
- **Cat Sighting Map:** Created a map with pins representing the location of sightings, and provided a filtering option based on time.
- **Announcements:** Integrated a new announcements page that allows admin users to create announcements that are then displayed to all users!
- **Announcement Notifications:** Improved announcement functionality by enabling push notifications when announcements are sent out.
- **Station Information Display:** Implemented a view page to display all stored station information.
- **Station Management:** Introduced a page for adding new stations, integrated with Firestore.
- **Enhanced Station Details:** Added restocking data to station details, along with filters and sorting options for improved navigation.
- **Catalog:** Users can now view a list of stray cats that the club has tracked. Cat name, recent sightings, and small cat details are all displayed.
- **Catalog Management:** Admin users are able to create new catalog entries, with an extensive number of input boxes for fine-grain descriptions.
- **Admin Management Throughout:** In almost every screen, admin users are able to edit and create items, allowing for proper management of the app's content

## Extra Features

- **GT-SSO:** For secure app access, Georgia Tech Single-Sign-On has been utilized for account creation and login.
- **Whitelist:** A form has been included to allow GT-alum to apply for app access. Admins can accept/deny whitelist applications from the settings page
- **Settings Page:** A Club Contact Information card has been added so that club members know how to contact people in charge.
- **User Management:** A list of all users with options to promote them to admin, demote them to general user, and block the user from the app have been added.
- **Responsive Styling:** Screen styling based on screen dimensions, allowing for the same user experience on all devices.

## Bug Fixes

- **Android Login Accessibility:** Ensured the login button remains accessible on Android devices, even when the keyboard is active.
- **Android Date Picker Display:** Resolved display issues with the date picker on Android devices.
- **Report Button Alignment:** Corrected the alignment of the report button across all devices.
- **Photo Permissions Issue:** Occurred when the user tries to select a photo for the report. Previously, this caused the selection to fail silently.
- **Disable back navigation from the home screen:** Previously, this allowed android and web users to return to the login screen without logging out.
- **Show status bar on Android:** Due to rendering differences between platforms, different stylings are required.
- **Duplicate Entry Creation:** Addressed a bug that caused duplicate entries in the Cat-alog for some uploads.
- **Unclickable Buttons:** Resolved an issue where the button was only clickable on the text, making the entire button area clickable.

## Known Issues

- **GT-SSO Errors on first try:** Likely due to browser issues, a user's first attempt to create an account using GT-SSO will cause an error message. However, when retrying the user will succesfully log in to their new account.
- **User Blocking:** After the integration of GT-SSO, the block user functionality no longer works as intended, allowing blocked users to log in still.
- **Styling Issues for Wider Devices:** Because styling is based on screen dimensions, devices with more square shapes like iPads have less than ideal screen styling compared to devices with more rectangular shapes like iPhones.
- **Lack of Flexibility:** Though an extensive amount of options are given to all "create screens" like creating a catalog entry, there is no way to add another input if the club decides they want to track a new detail about a cat, station, etc.
- **Homepage Map Optimization:** The homepage map currently makes more database queries than necessary; however, performance is not noticeably impacted.
