// app/_layout.tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import ErrorBoundary from "@/components/ErrorBoundary";
// import * as Notifications from "expo-notifications";
// import { Platform } from "react-native";
// import messaging from "@react-native-firebase/messaging";
// import {
//   setupNotificationHandlers,
//   setupBackgroundHandler,
//   requestFCMPermissions,
//   getFCMToken,
//   getNotificationData,
//   createNotificationChannels,
//   storeNotificationData,
// } from "@/utils/notificationHelper";

import { useColorScheme } from "@/hooks/useColorScheme";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Setup notification handling
  useEffect(() => {
    // async function setupNotifications() {
    //   try {
    //     // Set up notification handlers for Expo notifications
    //     setupNotificationHandlers();
    //     // Create Android channels
    //     await createNotificationChannels();
    //     // Set up Firebase background handler
    //     setupBackgroundHandler();
    //     // Request permissions
    //     const hasPermission = await requestFCMPermissions();
    //     if (hasPermission) {
    //       // Get token for this device
    //       const token = await getFCMToken();
    //       console.log("Device registered with FCM token:", token);
    //     } else {
    //       console.log("FCM permissions not granted");
    //     }
    //     // Handle foreground messages
    //     const unsubscribeForeground = messaging().onMessage(
    //       async (remoteMessage) => {
    //         console.log("Foreground message received:", remoteMessage);
    //         // If this is an image notification, show a local notification
    //         if (remoteMessage.data?.notificationType === "image_ready") {
    //           const dataKey = `img_${Date.now()}`;
    //           storeNotificationData(dataKey, {
    //             imageUrl: remoteMessage.data.imageUrl,
    //           });
    //           await Notifications.scheduleNotificationAsync({
    //             content: {
    //               title: remoteMessage.notification?.title || "Image Ready!",
    //               body:
    //                 remoteMessage.notification?.body ||
    //                 "Your filtered image is ready.",
    //               data: { dataKey },
    //             },
    //             trigger: null,
    //           });
    //         }
    //       }
    //     );
    //     // Set up notification tap handler
    //     const subscription =
    //       Notifications.addNotificationResponseReceivedListener((response) => {
    //         try {
    //           console.log("Notification tapped:", response);
    //           const data = response.notification.request.content.data;
    //           // Check if we have a dataKey (for stored image URL)
    //           if (data?.dataKey) {
    //             const storedData = getNotificationData(data.dataKey);
    //             if (storedData?.imageUrl) {
    //               // Navigate to result screen
    //               router.push({
    //                 pathname: "/result",
    //                 params: { imageUrl: storedData.imageUrl },
    //               });
    //               return;
    //             }
    //           }
    //           // Direct imageUrl in the data
    //           if (data?.imageUrl) {
    //             router.push({
    //               pathname: "/result",
    //               params: { imageUrl: data.imageUrl },
    //             });
    //           }
    //         } catch (error) {
    //           console.error("Error handling notification tap:", error);
    //         }
    //       });
    //     return () => {
    //       unsubscribeForeground();
    //       subscription.remove();
    //     };
    //   } catch (error) {
    //     console.error("Error setting up notifications:", error);
    //   }
    // }
    // setupNotifications();
  }, [router]);

  // Check if the app was opened from a notification when it was closed
  useEffect(() => {
    // const checkInitialNotification = async () => {
    //   try {
    //     // Get initial notification that opened the app
    //     const initialNotification = await messaging().getInitialNotification();
    //     if (initialNotification) {
    //       console.log(
    //         "App opened from quit state by notification:",
    //         initialNotification
    //       );
    //       // Handle the notification data similar to how you handle tapped notifications
    //       const data = initialNotification.data;
    //       if (data?.imageUrl) {
    //         router.push({
    //           pathname: "/result",
    //           params: { imageUrl: data.imageUrl as any },
    //         });
    //       }
    //     }
    //   } catch (error) {
    //     console.error("Error checking initial notification:", error);
    //   }
    // };
    // checkInitialNotification();
  }, [router]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ title: "Home" }} />
          <Stack.Screen name="upload" options={{ title: "Upload" }} />
          <Stack.Screen name="result" options={{ title: "Result" }} />
          <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
