// utils/firebaseInit.ts
import { Platform } from "react-native";
import { LogBox } from "react-native";
import Constants from "expo-constants";
// Ignore specific Firebase warnings
LogBox.ignoreLogs([
  "AsyncStorage has been extracted from react-native",
  "Setting a timer for a long period of time",
]);
const ENV = {
  FIREBASE_API_KEY:
    Constants.expoConfig?.extra?.firebaseApiKey ||
    "AIzaSyBp_JPcbkcyX38Cyo-XK2dNcsX-AJ7jLSI",
  FIREBASE_PROJECT_ID:
    Constants.expoConfig?.extra?.firebaseProjectId || "pixmix-6a12e",
  FIREBASE_APP_ID:
    Constants.expoConfig?.extra?.firebaseAppId ||
    "1:493914627855:android:e06a602407c8f6c126687a",
};
let isInitialized = false;

export async function initializeFirebase() {
  // Skip if already initialized or on web platform
  if (isInitialized || Platform.OS === "web") {
    return;
  }

  try {
    // Only import Firebase on native platforms
    const firebase = require("@react-native-firebase/app").default;

    // Check if Firebase is already initialized
    if (!firebase.apps.length) {
      // For development purposes, we're using the google-services.json file
      // that's already in the project
      await firebase.initializeApp();
      console.log("Firebase has been initialized successfully");
    } else {
      console.log("Firebase was already initialized");
    }

    isInitialized = true;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
}
