import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Key for storing custom server IP
const SERVER_IP_KEY = "filter_app_server_ip";

// Function to get server URL
const getServerUrl = async (): Promise<string> => {
  // Default URLs by platform
  let serverUrl = "http://192.168.0.107:3000/generate"; // Default for web

  if (Platform.OS === "android") {
    // Default for Android emulator
    serverUrl = "http://192.168.0.107:3000/generate";
  }

  try {
    // Try to get custom server IP from AsyncStorage
    const customServerIp = await AsyncStorage.getItem(SERVER_IP_KEY);
    if (customServerIp) {
      serverUrl = `http://${customServerIp}:3000/generate`;
      console.log(`Using custom server address: ${serverUrl}`);
    }
  } catch (error) {
    console.log("Could not load custom server address, using default");
  }

  return serverUrl;
};

// Function to save a custom server IP
export const saveServerIp = async (ip: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(SERVER_IP_KEY, ip);
    console.log(`Saved custom server IP: ${ip}`);
  } catch (error) {
    console.error("Failed to save custom server IP", error);
    throw new Error("Failed to save server settings");
  }
};

export const generateImage = async (
  imageUri: string,
  filter: string,
  fcmToken?: string // Add parameter for FCM token
): Promise<string> => {
  try {
    console.log(`Processing image with filter: ${filter}`);

    if (!imageUri) {
      throw new Error("No image selected");
    }

    // Create form data for the API request
    const formData = new FormData();

    // Get the server URL based on platform and environment or from storage
    const serverUrl = await getServerUrl();

    // Log server URL for debugging
    console.log(`Using server URL: ${serverUrl}`);

    // Handle image data
    if (
      typeof window !== "undefined" &&
      !/^file:/.test(imageUri) &&
      !/^content:/.test(imageUri)
    ) {
      // Web environment
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append("image", blob, "image.png");
    } else {
      // React Native environment
      let fileName = "image.png";
      let fileType = "image/png";

      if (imageUri.includes(".")) {
        const extension = imageUri.split(".").pop()?.toLowerCase();
        if (extension === "jpg" || extension === "jpeg") {
          fileType = "image/jpeg";
          fileName = "image.jpg";
        }
      }

      // For Android, ensure the correct file format
      formData.append("image", {
        uri:
          Platform.OS === "android"
            ? imageUri
            : imageUri.replace("file://", ""),
        name: fileName,
        type: fileType,
      } as any);
    }

    // Add filter parameter
    formData.append("filter", filter);

    // Add FCM token if available
    if (fcmToken) {
      formData.append("fcmToken", fcmToken);
      console.log("Added FCM token to request");
    }

    // Send the request with timeout
    console.log("Sending request to API server...");

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 100 second timeout

    try {
      const apiResponse = await fetch(serverUrl, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${serviceAccountToken}`, // Use the token from your service account
        },
        mode: "cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle response
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error("API error response:", errorText);

        try {
          const errorData = JSON.parse(errorText);
          throw new Error(
            errorData.message || `API error: ${apiResponse.status}`
          );
        } catch (e) {
          throw new Error(
            `API error: ${apiResponse.status}. Response: ${errorText.substring(
              0,
              100
            )}`
          );
        }
      }

      // Parse and return the result
      const data = await apiResponse.json();
      return data.imageUrl;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        throw new Error(
          "Request timed out. The server may be down or unreachable."
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error("Image processing error:", error);

    let errorMsg = "Failed to process image";
    if (error.message) {
      if (error.message.includes("Network request failed")) {
        errorMsg =
          "Network error. Please check your connection and ensure the server is running at the correct address.";
      } else {
        errorMsg = error.message;
      }
    }

    throw new Error(errorMsg);
  }
};
