import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

const AUTH_SERVICE_URL = 'https://gcloud-authentication-493914627855.us-central1.run.app';

/**
 * Gets a Cloud Run token from the auth service
 * This token will be used to authenticate requests to the main backend
 */
export async function getCloudRunToken(): Promise<string> {
  try {
    console.log('Requesting token from auth service...');

    // Get FCM token if possible
    let fcmToken = null;
    if (Platform.OS !== "web") {
      try {
        fcmToken = await messaging().getToken();
        console.log(
          "FCM token for auth request:",
          fcmToken ? "Retrieved" : "Not available"
        );
      } catch (err) {
        console.log('Could not get FCM token for auth request');
      }
    }
    
    // Add FCM token to URL if available
    const tokenEndpoint = fcmToken 
      ? `${AUTH_SERVICE_URL}/auth/public-token?fcmToken=${encodeURIComponent(fcmToken)}`
      : `${AUTH_SERVICE_URL}/auth/public-token`;
    
    // Request a token from the public endpoint
    const response = await fetch(tokenEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Auth service error:', errorText);
      throw new Error(`Failed to get token: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Successfully retrieved token');
    return data.token;
  } catch (error) {
    console.error('Error getting Cloud Run token:', error);
    throw new Error('Authentication failed. Please try again later.');
  }
}

// Token caching to improve performance and reduce API calls
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Gets a token, using cache if available
 * This helps reduce the number of token requests
 */
export async function getCachedCloudRunToken(): Promise<string> {
  // Check if we have a valid cached token
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    console.log('Using cached token');
    return cachedToken;
  }
  
  // Get a new token
  const token = await getCloudRunToken();
  
  // Cache the token (expires in 50 minutes to be safe)
  cachedToken = token;
  tokenExpiry = now + (50 * 60 * 1000); 
  console.log('Token cached, expires in 50 minutes');
  
  return token;
}

/**
 * Clears the token cache
 * Useful when handling authentication errors
 */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiry = null;
  console.log('Token cache cleared');
}