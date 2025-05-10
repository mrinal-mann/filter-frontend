/**
 * Notification Helper
 * Central place for handling FCM notifications in the mobile app
 */
import * as Notifications from "expo-notifications";
import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage keys
const NOTIFICATION_DATA_PREFIX = "notification_data_";
const FCM_TOKEN_KEY = "fcm_token";

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
    setupBackgroundHandler();

    // Request permissions and register token with backend
    const hasPermission = await requestFCMPermissions();
    
    if (hasPermission) {
      const token = await getFCMToken();
      if (token) {
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
 * Set up background message handler
 */
export function setupBackgroundHandler(): void {
  if (Platform.OS === "web") return;

  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log("Message handled in the background:", remoteMessage);

    // Store image URL for image_ready notifications
    if (
      remoteMessage.data?.notificationType === "image_ready" &&
      remoteMessage.data?.imageUrl
    ) {
      const dataKey = `img_${Date.now()}`;
      storeNotificationData(dataKey, {
        imageUrl: remoteMessage.data.imageUrl,
      });

      // Show a local notification that the user can tap
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title || "Image Ready!",
          body: remoteMessage.notification?.body ||
            "Your filtered image is ready. Tap to view.",
          data: { dataKey },
          ...(Platform.OS === "android"
            ? { channelId: "image-processing" }
            : {}),
        },
        trigger: null,
      });
    }
  });
}

/**
 * Request notification permissions
 */
export async function requestFCMPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) return false;

  try {
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.error("Error requesting FCM permissions:", error);
    return false;
  }
}

/**
 * Get the FCM token for this device
 */
export async function getFCMToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    // Use Expo's getDevicePushTokenAsync instead of Firebase messaging
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    
    // Cache the token
    if (deviceToken.data) {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, deviceToken.data);
    }
    
    return deviceToken.data;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
}

/**
 * Register device token with backend
 */
export async function registerDeviceWithBackend(fcmToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      "https://filter-backend-493914627855.us-central1.run.app/register-device",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceToken: fcmToken,
          platform: Platform.OS,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to register device");
    }
    
    return true;
  } catch (error) {
    console.error("Error registering device:", error);
    return false;
  }
}

/**
 * Store notification data for later retrieval
 */
export function storeNotificationData(key: string, data: any): string {
  const storageKey = `${NOTIFICATION_DATA_PREFIX}${key}`;
  try {
    AsyncStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error("Error storing notification data:", error);
  }
  return key;
}

/**
 * Get stored notification data
 */
export async function getNotificationData(key: string): Promise<any> {
  const storageKey = `${NOTIFICATION_DATA_PREFIX}${key}`;
  try {
    const data = await AsyncStorage.getItem(storageKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error retrieving notification data:", error);
    return null;
  }
}

/**
 * Show a local notification
 */
export async function showLocalNotification(
  title: string,
  body: string,
  data: any = {}
): Promise<boolean> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        ...(Platform.OS === "android" ? { channelId: "status-updates" } : {}),
      },
      trigger: null,
    });
    return true;
  } catch (error) {
    console.error("Error showing notification:", error);
    return false;
  }
}