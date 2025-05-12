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
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import messaging from "@react-native-firebase/messaging";
import {
  getNotificationData,
  setupNotifications,
} from "@/utils/notificationHelper";

import { useColorScheme } from "@/hooks/useColorScheme";
import { initializeFirebase } from "@/utils/firebaseInit";

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
    async function initializeApp() {
      // Initialize Firebase (only on native platforms)
      if (Platform.OS !== "web") {
        await initializeFirebase();
      }

      // Setup notifications and request permissions
      await setupNotifications();
    }

    initializeApp();

    // Check if app was opened from a notification when closed
    const checkInitialNotification = async () => {
      try {
        const initialNotification = await messaging().getInitialNotification();
        if (initialNotification) {
          console.log(
            "App opened from quit state by notification:",
            initialNotification
          );

          // Handle the notification data
          const data = initialNotification.data;
          if (data?.imageUrl) {
            router.push({
              pathname: "/result",
              params: { imageUrl: data.imageUrl as any },
            });
          }
        }
      } catch (error) {
        console.error("Error checking initial notification:", error);
      }
    };

    // Only run on native platforms
    if (Platform.OS !== "web") {
      checkInitialNotification();
    }

    // Set up notification tap handler
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        try {
          console.log("Notification tapped:", response);

          const data = response.notification.request.content.data;

          // Check if we have a dataKey (for stored image URL)
          if (data?.dataKey) {
            const storedData = await getNotificationData(data.dataKey);
            if (storedData?.imageUrl) {
              // Navigate to result screen
              router.push({
                pathname: "/result",
                params: { imageUrl: storedData.imageUrl },
              });
              return;
            }
          }

          // Direct imageUrl in the data
          if (data?.imageUrl) {
            router.push({
              pathname: "/result",
              params: { imageUrl: data.imageUrl },
            });
          }
        } catch (error) {
          console.error("Error handling notification tap:", error);
        }
      }
    );

    return () => {
      subscription.remove();
    };
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
