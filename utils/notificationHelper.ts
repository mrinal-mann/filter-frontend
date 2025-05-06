// utils/notificationHelper.ts
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Store for notification data (image URLs, etc)
const notificationData: Record<string, any> = {};

// Setup notifications - call this early in your app startup
export const setupNotifications = async () => {
  try {
    // Configure how notifications appear when the app is in foreground
    setupNotificationHandlers();

    // Return previously granted permissions, if any
    const authStatus = await messaging().hasPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    return enabled;
  } catch (error) {
    console.error("Error setting up notifications:", error);
    return false;
  }
};

// Request FCM permissions
export const requestFCMPermissions = async () => {
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
export const getFCMToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

// Register background handler
export const setupBackgroundHandler = () => {
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
        },
        trigger: null,
      });
    }
  });
};

// Store data for later retrieval via notifications
export const storeNotificationData = (key: string, data: any) => {
  notificationData[key] = data;
  console.log(`Stored notification data with key: ${key}`);
  return key;
};

// Retrieve stored notification data
export const getNotificationData = (key: string) => {
  return notificationData[key];
};

// Setup notification handlers
export const setupNotificationHandlers = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

// Create Android notification channels
export const createNotificationChannels = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("image-processing", {
      name: "Image Processing",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
      enableLights: true,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
  }
};

// Show a local notification (for backward compatibility)
export const showLocalNotification = async (
  title: string,
  body: string,
  data: any = {}
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null,
    });
    console.log(`Local notification scheduled: ${title}`);
    return true;
  } catch (error) {
    console.error("Error showing notification:", error);
    return false;
  }
};

// Send an image ready notification
export const showImageReadyNotification = async (
  title: string,
  body: string,
  imageUrl: string
) => {
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
      },
      trigger: null,
    });

    console.log(`Image ready notification scheduled: ${title}`);
    return true;
  } catch (error) {
    console.error("Error showing image ready notification:", error);
    return false;
  }
};
