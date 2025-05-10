/**
 * Notification Helper
 * Handles FCM token registration and notification setup
 */
import * as Notifications from "expo-notifications";
import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCachedCloudRunToken } from "../services/authService";

// Storage keys
const NOTIFICATION_DATA_PREFIX = "notification_data_";

// Android notification channels
export const createNotificationChannels = async (): Promise<void> => {
  if (Platform.OS === "android") {
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

    await Notifications.setNotificationChannelAsync("status-updates", {
      name: "Status Updates",
      description: "Updates about image processing progress",
      importance: Notifications.AndroidImportance.DEFAULT, // Less intrusive
      vibrationPattern: [0, 100],
      enableLights: false,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      showBadge: false,
    });
  }
};

// Set up notification handler
export const setupNotificationHandlers = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

// Set up Firebase background message handler
export const setupBackgroundHandler = (): void => {
  if (Platform.OS === "web") return;

  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log("Message handled in the background:", remoteMessage);

    if (
      remoteMessage.data?.notificationType === "image_ready" &&
      remoteMessage.data?.imageUrl
    ) {
      const dataKey = `img_${Date.now()}`;
      storeNotificationData(dataKey, {
        imageUrl: remoteMessage.data.imageUrl,
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title || "Image Ready!",
          body:
            remoteMessage.notification?.body ||
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
};

// Request FCM permissions
export const requestFCMPermissions = async (): Promise<boolean> => {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) return false;

  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
  } catch (error) {
    console.error("Error requesting FCM permissions:", error);
    return false;
  }
};

// Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  if (Platform.OS === "web") return null;

  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

// Register device with backend
export const registerDeviceWithBackend = async (): Promise<boolean> => {
  try {
    // Get device token using Expo's API
    const deviceToken = await getFCMToken();
    if (!deviceToken) return false;

    // Get auth token
    const authToken = await getCachedCloudRunToken();

    // Send to backend
    const response = await fetch(
      "https://filter-backend-493914627855.us-central1.run.app/register-device",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deviceToken,
          platform: Platform.OS,
        }),
      }
    );

    if (!response.ok) throw new Error("Failed to register device");
    return true;
  } catch (error) {
    console.error("Error registering device:", error);
    return false;
  }
};

// Store notification data for later retrieval
export const storeNotificationData = (key: string, data: any): string => {
  const storageKey = `${NOTIFICATION_DATA_PREFIX}${key}`;
  try {
    AsyncStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error("Error storing notification data:", error);
  }
  return key;
};

// Get stored notification data
export const getNotificationData = async (key: string): Promise<any> => {
  const storageKey = `${NOTIFICATION_DATA_PREFIX}${key}`;
  try {
    const data = await AsyncStorage.getItem(storageKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error retrieving notification data:", error);
    return null;
  }
};

// Complete notification setup
export const setupNotifications = async (): Promise<boolean> => {
  try {
    // Create channels
    await createNotificationChannels();

    // Set up handlers
    setupNotificationHandlers();
    setupBackgroundHandler();

    // Request permissions
    const hasPermission = await requestFCMPermissions();
    if (hasPermission) {
      // Register with backend
      await registerDeviceWithBackend();
    }

    return true;
  } catch (error) {
    console.error("Error setting up notifications:", error);
    return false;
  }
};
