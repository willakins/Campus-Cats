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
These third-party libraries must be installed when you install the app's dependencies. You do not need to install them manually — they're handled by running npm install in a terminal inside of the project directory.

Some key dependencies include:

firebase: Firebase backend integration

react-navigation: Navigation between screens

expo-image-picker: Image upload

react-native-elements, react-native-vector-icons: UI elements

@react-native-community/datetimepicker: Date/time selection

The full list is available in the package.json file.

## Download Instructions
Clone the repository:

````bash
git clone https://github.com/your-username/campus-cats.git
cd campus-cats
````
Install dependencies:

bash
Copy
Edit
npm install
🛠️ Build Instructions
No manual build process is needed thanks to Expo. Expo handles compiling and bundling automatically when you run the app.

🚀 Installation of Actual Application
After installing the dependencies, follow these steps:

Start the Expo development server:

bash
Copy
Edit
expo start
A QR code will appear in your terminal or browser.

Open the Expo Go app on your physical device and scan the QR code to run the app instantly.

▶️ Run Instructions
From the root project directory, start the app with:

bash
Copy
Edit
expo start
Press a to open in Android Emulator (if configured)

Press i to open in iOS Simulator (if configured)

Or scan the QR code with Expo Go on a physical device
