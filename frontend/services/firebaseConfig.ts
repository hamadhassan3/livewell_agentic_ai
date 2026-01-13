// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { Platform } from "react-native";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "<API_KEY>",
  authDomain: "livewell-f.firebaseapp.com",
  projectId: "livewell-f",
  storageBucket: "livewell-f.firebasestorage.app",
  messagingSenderId: "832168591779",
  appId: "1:832168591779:web:8809202ba206fd0857da16",
  measurementId: "G-ESRB0CSJ87"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only if supported (web only)
let analytics: any = null;
if (Platform.OS === 'web') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, analytics };