/**
 * Notification Helper
 * Central place for handling FCM notifications in the mobile app
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage keys
const NOTIFICATION_DATA_PREFIX = "notification_data_";
const FCM_TOKEN_KEY = "fcm_token";
/**
 * Creates Android notification channels
 */
export async function createNotificationChannels(): Promise<void> {
  if (Platform.OS === "android") {
    // Main notification channel for image processing results
    await Notifications.setNotificationChannelAsync("image-processing", {
      name: "Image Processing",
      description: "Notifications for image processing status and results",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3B82F6", // Blue color that matches app theme
      sound: "default",
      enableLights: true,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });

    // Secondary channel for status updates (less intrusive)
    await Notifications.setNotificationChannelAsync("status-updates", {
      name: "Status Updates",
      description: "Updates about image processing progress",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      enableLights: false,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      showBadge: false,
    });
  }
}

/**
 * Configure notification handling
 */
export function setupNotificationHandlers(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Get the FCM token for this device using Expo's API
 */
export async function getFCMToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    // Use Expo's getDevicePushTokenAsync - this gets FCM token on Android and APNs on iOS
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    
    // Cache the token
    if (deviceToken.data) {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, deviceToken.data);
    }
    
    return deviceToken.data;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    // Try to get from cache if available
    try {
      const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      return cachedToken;
    } catch (cacheError) {
      console.error("Error getting cached token:", cacheError);
      return null;
    }
  }
}

/**
 * Register device token with backend
 */
export async function registerDeviceWithBackend(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      "https://filter-backend-493914627855.us-central1.run.app/register-device",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceToken: token,
          platform: Platform.OS,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to register device");
    }
    
    console.log("Device registered successfully with backend");
    return true;
  } catch (error) {
    console.error("Error registering device:", error);
    return false;
  }
}

/**
 * Sets up notification handler for the app
 * Should be called once during app initialization
 */
export async function setupNotifications(): Promise<boolean> {
  try {
    // Create notification channels for Android
    if (Platform.OS === "android") {
      await createNotificationChannels();
    }

    // Set up handlers
    setupNotificationHandlers();
    setupBackgroundHandler(); // Remove Firebase-specific handling here

    // Request permissions
    const hasPermission = await requestFCMPermissions();
    
    if (hasPermission) {
      // Get token using Expo's API
      const token = await getFCMToken();
      if (token) {
        // Register with backend
        await registerDeviceWithBackend(token);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error setting up notifications:", error);
    return false;
  }
}

/**
 * Request notification permissions (works for both iOS and Android)
 */
export async function requestFCMPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) return false;

  try {
    // Use Expo's permission API
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  } catch (error) {
    console.error("Error requesting permissions:", error);
    return false;
  }
}

/**
 * Set up background message handler
 * Note: Remove Firebase-specific background handler since Expo handles this
 */
export function setupBackgroundHandler(): void {
  if (Platform.OS === "web") return;

  // Expo handles background notifications automatically
  // Just ensure your notification handlers are set up
  console.log("Background notification handling configured via Expo");
}