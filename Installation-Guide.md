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

### 4. Expo Go App (for mobile testing)
Allows you to run the app on your iOS or Android device.

## Dependent Libraries
These third-party libraries must be installed when you install the app's dependencies. You do not need to install them manually — they're handled through npm install.

Some key dependencies include:

firebase: Firebase backend integration

react-navigation: Navigation between screens

expo-image-picker: Image upload

react-native-elements, react-native-vector-icons: UI elements

@react-native-community/datetimepicker: Date/time selection

The full list is available in the package.json file.
