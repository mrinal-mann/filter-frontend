/**
 * Authentication Service
 * Handles token retrieval from the auth service
 */
import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";
import auth from "@react-native-firebase/auth";

// Update to production endpoint
const AUTH_SERVICE_URL =
  "https://gcloud-authentication-493914627855.us-central1.run.app";
// Google Identity Token provider endpoint - you need to create this
const IDENTITY_TOKEN_PROVIDER =
  "https://your-token-provider/get-identity-token";

// Token caching to improve performance and reduce API calls
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;
let cachedIdentityToken: string | null = null;
let identityTokenExpiry: number | null = null;

/**
 * Gets a Google identity token for Cloud Run authentication
 * This is needed because the service requires authentication
 */
async function getGoogleIdentityToken(): Promise<string> {
  try {
    // Check if we have a cached identity token that's not expired
    const now = Date.now();
    if (
      cachedIdentityToken &&
      identityTokenExpiry &&
      now < identityTokenExpiry
    ) {
      console.log("Using cached identity token");
      return cachedIdentityToken;
    }

    // In a real implementation, you would call your backend token provider
    // For now, we'll use Firebase custom tokens if available
    if (auth().currentUser) {
      try {
        // Get a Firebase ID token
        const firebaseToken = await auth().currentUser?.getIdToken(true);

        // Use Firebase token directly - if your backend accepts it
        // Or exchange it for a Google identity token via your backend
        console.log("Got Firebase token for authentication");

        // Cache the token (expires in 50 minutes to be safe)
        cachedIdentityToken = firebaseToken || "";
        identityTokenExpiry = now + 50 * 60 * 1000;

        return firebaseToken || "";
      } catch (error) {
        console.error("Error getting Firebase token:", error);
      }
    }

    // For testing, you can manually get a token using gcloud and paste it here
    // This is temporary until you set up a proper token provider
    const manualToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImUxNGMzN2Q2ZTVjNzU2ZThiNzJmZGI1MDA0YzBjYzM1NjMzNzkyNGUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIzMjU1NTk0MDU1OS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsImF1ZCI6IjMyNTU1OTQwNTU5LmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwic3ViIjoiMTA0MzU5ODA4MTUwMjAxODg3MjQyIiwiaGQiOiJnZXRrbnVnZ2V0LmNvbSIsImVtYWlsIjoiZGV2ZWxvcGVyQGdldGtudWdnZXQuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiJMYXVWcm9zUUt4aUlYSTN2dGlqNlFBIiwiaWF0IjoxNzQ3MDU2NzUyLCJleHAiOjE3NDcwNjAzNTJ9.d3wfKi1WZiT4Dfvsu-Rep-xmw6xV_yE3kjjjsUCjQrmU5RX1WCQGtPThU0Fchcke3Jg9G7Dfrqu0vfxasH4P8Zi2NRVMaSNwOhqVVa6PpAWNczbkk4UD4ya7PinPT5odc8TxAJFUKvIWHfKAkRWtpwRzsPxjsH3Nqe3jR6jmhefH3kcfJhQveQXIHOuKvVV0c63u8I3jalFDHQHssDe3__eq6y4-CwfgzK0h-06rvwYEk75bEzvQ1MpVd93QXSsSx1afLs8lClU-28NIVDZx5iQp9BHORnjlgTKSxSweuOVhOudkwHsGgC11iUDtkrvXUnJ9xlUekqPqiFnTdPXG6g"; // Replace with token from: gcloud auth print-identity-token

    console.warn(
      "⚠️ Using manual identity token. In production, set up a token provider service."
    );

    // Cache the manual token (1 hour expiry)
    cachedIdentityToken = manualToken;
    identityTokenExpiry = now + 60 * 60 * 1000;

    return manualToken;

    // UNCOMMENT THIS WHEN YOU HAVE A TOKEN PROVIDER:
    /*
    // Get a token from your backend token provider
    const response = await fetch(IDENTITY_TOKEN_PROVIDER);
    if (!response.ok) {
      throw new Error(`Failed to get identity token: ${response.status}`);
    }
    
    const data = await response.json();
    const identityToken = data.token;
    
    // Cache the token (expires in 50 minutes to be safe)
    cachedIdentityToken = identityToken;
    identityTokenExpiry = now + 50 * 60 * 1000;
    
    return identityToken;
    */
  } catch (error) {
    console.error("Error getting identity token:", error);
    throw new Error("Failed to get authentication token");
  }
}

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

    // Get a Google identity token for authentication
    const identityToken = await getGoogleIdentityToken();
    console.log("Got identity token for authentication");

    // Request public token
    const tokenEndpoint = `${AUTH_SERVICE_URL}/auth/public-token`;
    console.log("Requesting from endpoint:", tokenEndpoint);

    // Request a token from the public endpoint with proper headers
    const response = await fetch(tokenEndpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${identityToken}`,
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
  cachedIdentityToken = null;
  identityTokenExpiry = null;
  console.log("Token cache cleared");
}
