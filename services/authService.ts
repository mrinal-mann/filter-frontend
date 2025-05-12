/**
 * Authentication Service
 * Handles token retrieval from the auth service
 */
import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";

const AUTH_SERVICE_URL = "http://localhost:4000";

// Token caching to improve performance and reduce API calls
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Gets a Cloud Run token from the auth service
 * This token will be used to authenticate requests to the main backend
 */
export async function getCloudRunToken(): Promise<string> {
  try {
    console.log("Requesting token from auth service...");

    // Get FCM token if possible
    let fcmToken = null;
    if (Platform.OS !== "web") {
      try {
        fcmToken = await messaging().getToken();
        console.log(
          "Got FCM token for auth request:",
          fcmToken.substring(0, 10) + "..."
        );
      } catch (err) {
        console.log("Could not get FCM token for auth request:", err);
      }
    }

    // Request public token
    const tokenEndpoint = `${AUTH_SERVICE_URL}/auth/public-token`;
    console.log("Requesting from endpoint:", tokenEndpoint);

    // Request a token from the public endpoint with proper headers
    const response = await fetch(tokenEndpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Auth service error:", errorText);
      throw new Error(`Failed to get token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(
      "Received token (first 20 chars):",
      data.token.substring(0, 20) + "..."
    );
    return data.token;
  } catch (error) {
    console.error("Error getting Cloud Run token:", error);
    throw new Error("Authentication failed. Please try again later.");
  }
}

/**
 * Gets a token, using cache if available
 * This helps reduce the number of token requests
 */
export async function getCachedCloudRunToken(): Promise<string> {
  // Check if we have a valid cached token
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    console.log(
      "Using cached token (first 20 chars):",
      cachedToken.substring(0, 20) + "..."
    );
    return cachedToken;
  }

  console.log("No valid cached token, requesting new one");
  // Get a new token
  const token = await getCloudRunToken();

  // Cache the token (expires in 50 minutes to be safe)
  cachedToken = token;
  tokenExpiry = now + 50 * 60 * 1000;
  console.log("Token cached, expires in 50 minutes");

  return token;
}

/**
 * Clears the token cache
 * Useful when handling authentication errors
 */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiry = null;
  console.log("Token cache cleared");
}