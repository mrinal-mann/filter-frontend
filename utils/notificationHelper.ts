// utils/notificationHelper.ts
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Store for notification data (image URLs, etc)
const notificationData: Record<string, any> = {};

// Configured flag to prevent multiple initializations
let isConfigured = false;

// Setup notifications - call this early in your app startup
export const setupNotifications = async (): Promise<boolean> => {
  if (isConfigured) return true;

  try {
    if (Platform.OS === "web") {
      console.log("FCM not supported on web platform");
      return false;
    }

    // Configure how notifications appear when the app is in foreground
    setupNotificationHandlers();

    // Create notification channels for Android
    await createNotificationChannels();

    isConfigured = true;
    return true;
  } catch (error) {
    console.error("Error setting up notifications:", error);
    return false;
  }
};

// Request FCM permissions
export const requestFCMPermissions = async (): Promise<boolean> => {
  if (Platform.OS === "web") {
    return false;
  }

  if (!Device.isDevice) {
    console.log("Cannot request notifications on simulator/emulator");
    return false;
  }

  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log("FCM authorization status:", enabled ? "Granted" : "Denied");
    return enabled;
  } catch (error) {
    console.error("Error requesting FCM permissions:", error);
    return false;
  }
};

// Get FCM token for this device
export const getFCMToken = async (): Promise<string | null> => {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    // Check permissions first
    const authStatus = await messaging().hasPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log("No FCM permissions to get token");
      return null;
    }

    const token = await messaging().getToken();
    console.log("FCM Token:", token.substring(0, 10) + "...");
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

// Register background handler
export const setupBackgroundHandler = (): void => {
  if (Platform.OS === "web") {
    return;
  }

  // Register background handler
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log("Message handled in the background:", remoteMessage);

    // If this is an image completion notification, store the data
    if (
      remoteMessage.data?.notificationType === "image_ready" &&
      remoteMessage.data?.imageUrl
    ) {
      const dataKey = `img_${Date.now()}`;
      storeNotificationData(dataKey, {
        imageUrl: remoteMessage.data.imageUrl,
      });

      // Create a local notification that will be shown when tapped
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title || "Image Ready!",
          body:
            remoteMessage.notification?.body ||
            "Your filtered image is ready. Tap to view.",
          data: { dataKey },
          // Specify Android channel
          ...(Platform.OS === "android" ? { channelId: "image-processing" } : {}),
        },
        trigger: null,
      });
    }
  });
};

// Store data for later retrieval via notifications
export const storeNotificationData = (key: string, data: any): string => {
  notificationData[key] = data;
  console.log(`Stored notification data with key: ${key}`);
  return key;
};

// Retrieve stored notification data
export const getNotificationData = (key: string): any => {
  return notificationData[key];
};

// Setup notification handlers
export const setupNotificationHandlers = (): void => {
  if (Platform.OS === "web") {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

// Create Android notification channels
export const createNotificationChannels = async (): Promise<void> => {
  if (Platform.OS === "android") {
    try {
      // Main channel for image processing notifications
      await Notifications.setNotificationChannelAsync("image-processing", {
        name: "Image Processing",
        description: "Notifications for image processing status and results",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#3B82F6", // Blue color that matches your app theme
        sound: "default", // Use default sound
        enableLights: true,
        enableVibrate: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
      });

      // Status update channel (for process updates)
      await Notifications.setNotificationChannelAsync("status-updates", {
        name: "Status Updates",
        description: "Updates about image processing progress",
        importance: Notifications.AndroidImportance.DEFAULT, // Less intrusive
        vibrationPattern: [0, 100],
        enableLights: false,
        enableVibrate: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PRIVATE,
        showBadge: false,
      });

      console.log("Android notification channels created successfully");
    } catch (error) {
      console.error("Error creating notification channels:", error);
    }
  }
};

export const showLocalNotification = async (
  title: string,
  body: string,
  data: any = {},
  channelId: string = "image-processing" // Default channel
): Promise<boolean> => {
  if (Platform.OS === "web") {
    console.log("Notifications not available on web");
    return false;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        // Specify Android channel
        ...(Platform.OS === "android" ? { channelId } : {}),
      },
      trigger: null,
    });
    console.log(
      `Local notification scheduled: ${title} on channel ${channelId}`
    );
    return true;
  } catch (error) {
    console.error("Error showing notification:", error);
    return false;
  }
};

// Also update showImageReadyNotification to specify the channel
export const showImageReadyNotification = async (
  title: string,
  body: string,
  imageUrl: string,
  channelId: string = "image-processing"
): Promise<boolean> => {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    // Create a data key to store the image URL
    const dataKey = `img_${Date.now()}`;
    storeNotificationData(dataKey, { imageUrl });

    // Schedule a local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { dataKey, notificationType: "image_ready" },
        // Specify Android channel
        ...(Platform.OS === "android" ? { channelId } : {}),
      },
      trigger: null,
    });

    console.log(
      `Image ready notification scheduled: ${title} on channel ${channelId}`
    );
    return true;
  } catch (error) {
    console.error("Error showing image ready notification:", error);
    return false;
  }
};
