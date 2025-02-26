// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDqweo_-BDd8jz-h0n_cKk0jgMbLu9w4kg",
  authDomain: "campuscats-d7a5e.firebaseapp.com",
  projectId: "campuscats-d7a5e",
  storageBucket: "campuscats-d7a5e.firebasestorage.app",
  messagingSenderId: "488622327541",
  appId: "1:488622327541:web:6d94f6cb1532efc08ce7bc",
  measurementId: "G-WM410CRM8T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { auth, storage, db };
