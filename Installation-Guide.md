# Campus Cats – Installation Guide

This guide walks you through setting up and running the Campus Cats mobile application on your local machine or test device.

---

## Pre-requisites

Before installing and running the Campus Cats app, ensure your system meets the following requirements:

### 1. Node.js and npm

Required for running JavaScript tools and installing dependencies.  
[Install Node.js (LTS version recommended)](https://nodejs.org/)

### 2. Expo CLI

Required to run the React Native project.

```bash
npm install -g expo-cli
```

### 3. Git

Required to clone the repository.  
[Install Git](https://git-scm.com)

### 4. Expo Go App (for mobile testing)

Allows you to run the app on your iOS or Android device.  
[Download for iOS and Android](https://expo.dev/go)

## Dependent Libraries

These third-party libraries must be installed when you install the app's dependencies. You do not need to install them manually — they're handled by running

```bash
npm install
```

in a terminal inside of the project directory.

Some key dependencies include:

firebase: Firebase backend integration

react-navigation: Navigation between screens

expo-image-picker: Image upload

react-native-elements, react-native-vector-icons: UI elements

@react-native-community/datetimepicker: Date/time selection

The full list is available in the package.json file.

## Download Instructions

Clone the repository:

```bash
git clone https://github.com/willakins/JIC-4331-ScrapCats.git
cd JIC-4331-ScrapCats
```

Install dependencies:

```bash
npm install
```

## Build Instructions

No manual build process is needed thanks to Expo. Expo handles compiling and bundling automatically when you run the app.

Installation of Actual Application
After installing the dependencies, follow these steps:

Start the Expo development server:

```bash
npx expo start --clear --tunnel
```

A QR code will appear in your terminal or browser.
Open the Expo Go app on your physical device and scan the QR code to run the app instantly.

## Run Instructions

From the root project directory, start the app with:

```bash
npx expo start --clear --tunnel
```

- Press a to open in Android Emulator (if configured)
- Press i to open in iOS Simulator (if configured)
  Or scan the QR code with Expo Go on a physical device

- If you're experiencing trouble, maybe try:

```bash
EXPO_TUNNEL_SUBDOMAIN=gatechCampusCats npx expo start --tunnel
```

## Troubleshooting

| Issue                              | Solution                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `expo command not found`           | Run `npm install -g expo-cli` to install Expo CLI globally.                                                                      |
| QR Code not scanning               | Ensure your computer and phone are on the same Wi-Fi network.                                                                    |
| Firebase errors                    | Check that you haven't exceeded the allowed number of firebase accesses for your billing plan.                                   |
| Dependency version mismatch errors | Run `npm install` again. If issues persist, delete `node_modules` and `package-lock.json`, then run `npm install` again.         |
| Permissions errors (camera, etc.)  | Ensure you’ve granted camera and media access permissions in your device settings. Expo will also prompt for these on first use. |
