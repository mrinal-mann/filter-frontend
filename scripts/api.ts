import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const generateImage = async (
  imageUri: string,
  filter: string,
  fcmToken?: string  // Add parameter for FCM token
): Promise<string> => {
  try {
    console.log(`Processing image with filter: ${filter}`);
    
    if (!imageUri) {
      throw new Error("No image selected");
    }
    
    // Create form data for the API request
    const formData = new FormData();
    
    // Get the server URL based on platform and environment
    let serverUrl = 'http://localhost:3000/generate'; // Default for web
    
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // For Expo development
      const debuggerHost = Constants.expoConfig?.hostUri || 
                         Constants.manifest?.debuggerHost || 
                         Constants.manifest2?.extra?.expoGo?.debuggerHost;
      
      if (debuggerHost) {
        const hostWithoutPort = debuggerHost.split(':')[0];
        serverUrl = `http://${hostWithoutPort}:3000/generate`;
      } else if (Platform.OS === 'android') {
        serverUrl = 'http://10.0.2.2:3000/generate';
      }
    }
    
    console.log(`Using server URL: ${serverUrl}`);
    
    // Handle image data
    if (typeof window !== "undefined" && !/^file:/.test(imageUri) && !/^content:/.test(imageUri)) {
      // Web environment
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append("image", blob, "image.png");
    } else {
      // React Native environment
      let fileName = "image.png";
      let fileType = "image/png";
      
      if (imageUri.includes('.')) {
        const extension = imageUri.split('.').pop()?.toLowerCase();
        if (extension === 'jpg' || extension === 'jpeg') {
          fileType = 'image/jpeg';
          fileName = 'image.jpg';
        } 
      }
      
      formData.append("image", {
        uri: imageUri,
        name: fileName,
        type: fileType
      } as any);
    }
    
    // Add filter parameter
    formData.append("filter", filter);
    
    // Add FCM token if available
    if (fcmToken) {
      formData.append("fcmToken", fcmToken);
      console.log("Added FCM token to request");
    }
    
    // Send the request
    console.log("Sending request to API server...");
    const apiResponse = await fetch(serverUrl, {
      method: "POST",
      body: formData,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    // Handle response
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("API error response:", errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || `API error: ${apiResponse.status}`);
      } catch (e) {
        throw new Error(`API error: ${apiResponse.status}. Response: ${errorText.substring(0, 100)}`);
      }
    }
    
    // Parse and return the result
    const data = await apiResponse.json();
    return data.imageUrl;
  } catch (error: any) {
    console.error("Image processing error:", error);
    
    let errorMsg = "Failed to process image";
    if (error.message) {
      if (error.message.includes("Network request failed")) {
        errorMsg = "Network error. Please check your connection and ensure the server is running.";
      } else {
        errorMsg = error.message;
      }
    }
    
    throw new Error(errorMsg);
  }
};