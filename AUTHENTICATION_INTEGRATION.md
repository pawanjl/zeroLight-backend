# Authentication Integration Guide

Complete reference for integrating the ZeroLight authentication system into your frontend application.

## Overview

The authentication system uses a two-tier approach:
1. **Privy** for initial user verification
2. **JWT tokens** for subsequent API requests

## Authentication Flow

```
Frontend (React/RN) → Privy Login → Get Privy Token
                         ↓
Backend Login API ← Send Privy Token + Device Info + Push Token
                         ↓
Backend Verifies → Creates/Updates User → Creates/Updates Session
                         ↓
Frontend ← Receive JWT Tokens + User Info + isNewUser Flag
                         ↓
Frontend Stores Tokens → Use Access Token for API Calls
```

---

## API Endpoints

### Base URL
```
Production: https://your-domain.com
Development: http://localhost:3000
```

---

## 1. Login

Exchange Privy access token for backend JWT tokens.

### Endpoint
```
POST /api/auth/login
```

### Request Headers
```
Content-Type: application/json
```

### Request Body

```typescript
{
  privyToken: string;      // REQUIRED - Privy access token from frontend
  deviceId?: string;       // OPTIONAL - Unique device identifier (UUID recommended)
  deviceName?: string;     // OPTIONAL - Human-readable device name
  platform?: string;       // OPTIONAL - "ios" | "android" | "web"
  pushToken?: string;      // OPTIONAL - Push notification token (FCM/APNS)
}
```

### Example Request

```bash
curl -X POST https://api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "privyToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceName": "iPhone 14 Pro",
    "platform": "ios",
    "pushToken": "ExponentPushToken[xxxxxxxxxxxxx]"
  }'
```

### Success Response (200)

```typescript
{
  success: true;
  data: {
    user: {
      id: string;                    // User UUID
      privyId: string;               // Privy DID
      email?: string;
      phone?: string;
      walletAddress?: string;
      displayName?: string;
      profilePictureUrl?: string;
    };
    tokens: {
      accessToken: string;           // JWT access token (1 hour default)
      refreshToken: string;          // JWT refresh token (7 days default)
      expiresIn: number;            // Seconds until access token expires
      tokenType: "Bearer";
    };
    isNewUser: boolean;             // true if account just created, false if existing user
    session?: {                     // Present if device info was provided
      id: string;                   // Session UUID
      deviceId: string;
      platform: string;
    };
  };
  message: string;                  // "Account created successfully" or "Login successful"
  timestamp: string;
}
```

### Example Success Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "privyId": "did:privy:clxxx...",
      "email": "user@example.com",
      "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600,
      "tokenType": "Bearer"
    },
    "isNewUser": true,
    "session": {
      "id": "session-uuid-here",
      "deviceId": "550e8400-e29b-41d4-a716-446655440000",
      "platform": "ios"
    }
  },
  "message": "Account created successfully",
  "timestamp": "2025-11-07T10:30:00.000Z"
}
```

### Error Response (401)

```json
{
  "success": false,
  "error": "Invalid Privy token",
  "message": "Token verification failed"
}
```

---

## 2. Refresh Token

Get a new access token using a refresh token.

### Endpoint
```
POST /api/auth/refresh
```

### Request Body

```typescript
{
  refreshToken: string;     // REQUIRED - Refresh token from login
}
```

### Example Request

```bash
curl -X POST https://api.example.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600,
      "tokenType": "Bearer"
    }
  },
  "message": "Token refreshed successfully",
  "timestamp": "2025-11-07T10:30:00.000Z"
}
```

---

## 3. Get Current User

Get details of the currently authenticated user.

### Endpoint
```
GET /api/auth/me
```

### Request Headers
```
Authorization: Bearer <access_token>
```

### Example Request

```bash
curl -X GET https://api.example.com/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "privyId": "did:privy:clxxx...",
    "email": "user@example.com",
    "status": "active",
    "createdAt": "2025-10-16T21:59:48.562Z",
    "lastActiveAt": "2025-11-07T10:30:00.000Z",
    "activeSessions": [
      {
        "id": "session-uuid",
        "deviceName": "iPhone 14 Pro",
        "platform": "ios",
        "lastActivityAt": "2025-11-07T10:30:00.000Z"
      }
    ]
  },
  "timestamp": "2025-11-07T10:30:00.000Z"
}
```

---

## 4. Logout

Logout and optionally terminate a session.

### Endpoint
```
POST /api/auth/logout
```

### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Body

```typescript
{
  sessionId?: string;     // OPTIONAL - Specific session to terminate
}
```

### Example Request

```bash
curl -X POST https://api.example.com/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-uuid-here"
  }'
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Logged out successfully",
  "timestamp": "2025-11-07T10:30:00.000Z"
}
```

---

## Frontend Integration Examples

### React/React Native with Privy

```typescript
import { usePrivy } from '@privy-io/react-auth';
import axios from 'axios';

// 1. Setup API client
const api = axios.create({
  baseURL: 'https://api.example.com',
});

// 2. Login function
export const loginWithPrivy = async (
  privyToken: string,
  deviceInfo?: {
    deviceId: string;
    deviceName: string;
    platform: 'ios' | 'android' | 'web';
    pushToken?: string;
  }
) => {
  try {
    const response = await api.post('/api/auth/login', {
      privyToken,
      ...deviceInfo,
    });

    const { data } = response.data;
    
    // Store tokens securely
    await SecureStore.setItemAsync('accessToken', data.tokens.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.tokens.refreshToken);
    
    // Handle new user onboarding
    if (data.isNewUser) {
      console.log('New user! Show onboarding...');
      // Navigate to onboarding screen
    }
    
    return {
      user: data.user,
      isNewUser: data.isNewUser,
      session: data.session,
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// 3. Usage in component
function LoginScreen() {
  const { getAccessToken } = usePrivy();
  
  const handleLogin = async () => {
    try {
      // Get Privy token
      const privyToken = await getAccessToken();
      
      // Get device info
      const deviceId = await getDeviceId(); // Your implementation
      const deviceName = await getDeviceName(); // Your implementation
      const pushToken = await getPushToken(); // From expo-notifications
      
      // Login to backend
      const result = await loginWithPrivy(privyToken, {
        deviceId,
        deviceName,
        platform: 'ios', // or Platform.OS
        pushToken,
      });
      
      if (result.isNewUser) {
        // Navigate to onboarding
        navigation.navigate('Onboarding');
      } else {
        // Navigate to home
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };
  
  return <Button onPress={handleLogin} title="Login" />;
}
```

### Axios Interceptors for Token Refresh

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: 'https://api.example.com',
});

// Request interceptor - Add access token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        
        if (!refreshToken) {
          // No refresh token, logout
          throw new Error('No refresh token');
        }
        
        // Refresh the token
        const response = await axios.post(
          'https://api.example.com/api/auth/refresh',
          { refreshToken }
        );
        
        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
        
        // Store new tokens
        await SecureStore.setItemAsync('accessToken', accessToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        
        // Navigate to login
        // navigation.navigate('Login');
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

### Complete Authentication Hook

```typescript
import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import * as SecureStore from 'expo-secure-store';
import api from './api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const { getAccessToken, logout: privyLogout } = usePrivy();
  
  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);
  
  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        const response = await api.get('/api/auth/me');
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const login = async (deviceInfo?: {
    deviceId: string;
    deviceName: string;
    platform: 'ios' | 'android' | 'web';
    pushToken?: string;
  }) => {
    try {
      setIsLoading(true);
      
      // Get Privy token
      const privyToken = await getAccessToken();
      
      // Login to backend
      const response = await api.post('/api/auth/login', {
        privyToken,
        ...deviceInfo,
      });
      
      const { data } = response.data;
      
      // Store tokens
      await SecureStore.setItemAsync('accessToken', data.tokens.accessToken);
      await SecureStore.setItemAsync('refreshToken', data.tokens.refreshToken);
      
      setUser(data.user);
      setIsNewUser(data.isNewUser);
      
      return {
        user: data.user,
        isNewUser: data.isNewUser,
        session: data.session,
      };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = async (sessionId?: string) => {
    try {
      setIsLoading(true);
      
      // Logout from backend
      await api.post('/api/auth/logout', { sessionId });
      
      // Logout from Privy
      await privyLogout();
      
      // Clear tokens
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      
      setUser(null);
      setIsNewUser(false);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    user,
    isNewUser,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  };
};
```

### Usage in App

```typescript
import { useAuth } from './hooks/useAuth';
import { useEffect } from 'react';

function App() {
  const { user, isNewUser, isLoading, login } = useAuth();
  
  useEffect(() => {
    if (user && isNewUser) {
      // Show onboarding for new users
      navigation.navigate('Onboarding');
    }
  }, [user, isNewUser]);
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <LoginScreen />;
  }
  
  return <MainApp />;
}
```

---

## Device ID Best Practices

### React Native (Expo)

```typescript
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const getDeviceInfo = () => {
  return {
    deviceId: Application.androidId || Device.osBuildId || 'unknown',
    deviceName: Device.deviceName || `${Device.brand} ${Device.modelName}`,
    platform: Platform.OS as 'ios' | 'android',
  };
};
```

### React Native (without Expo)

```typescript
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

export const getDeviceInfo = async () => {
  return {
    deviceId: await DeviceInfo.getUniqueId(),
    deviceName: await DeviceInfo.getDeviceName(),
    platform: Platform.OS as 'ios' | 'android',
  };
};
```

### Web

```typescript
export const getDeviceInfo = () => {
  // Generate or retrieve from localStorage
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  
  return {
    deviceId,
    deviceName: navigator.userAgent,
    platform: 'web' as const,
  };
};
```

---

## Push Notification Token

### React Native (Expo)

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  
  return token;
};
```

---

## Error Handling

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Bad Request | Invalid request body or missing required fields |
| 401 | Unauthorized | Invalid or expired Privy token / JWT token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | User or resource not found |
| 409 | Conflict | Duplicate resource (e.g., user already exists) |
| 500 | Internal Server Error | Server error |

### Error Response Format

```typescript
{
  success: false;
  error: string;        // Error type
  message?: string;     // Detailed error message
}
```

### Handling Errors

```typescript
try {
  const result = await loginWithPrivy(privyToken, deviceInfo);
} catch (error) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message;
    
    switch (status) {
      case 401:
        // Invalid Privy token - re-authenticate with Privy
        console.error('Invalid token, please login again');
        break;
      case 500:
        // Server error - show error message
        console.error('Server error:', message);
        break;
      default:
        console.error('Unknown error:', message);
    }
  }
}
```

---

## Security Best Practices

### Token Storage

**✅ DO:**
- Use `SecureStore` (Expo) or `react-native-keychain` for mobile
- Use `HttpOnly` cookies for web (if backend supports)
- Store access token in memory when possible

**❌ DON'T:**
- Never store tokens in `AsyncStorage` (mobile)
- Never store tokens in `localStorage` (web)
- Never log tokens to console in production

### Token Refresh

- Implement automatic token refresh on 401 errors
- Refresh tokens proactively before they expire
- Handle refresh token expiration by logging out user

### HTTPS Only

- Always use HTTPS in production
- Never send tokens over HTTP

---

## Testing

### Test Login Flow

```bash
# 1. Get Privy token from your frontend
PRIVY_TOKEN="your-privy-token"

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"privyToken\": \"$PRIVY_TOKEN\",
    \"deviceId\": \"test-device-123\",
    \"deviceName\": \"Test Device\",
    \"platform\": \"ios\",
    \"pushToken\": \"ExponentPushToken[test]\"
  }"

# 3. Extract access token from response
ACCESS_TOKEN="your-access-token"

# 4. Test protected endpoint
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Support

For issues or questions:
- Review the [Authentication Setup Guide](./AUTHENTICATION_SETUP.md)
- Check the [API Documentation](./API_DOCUMENTATION.md)
- Check server logs for detailed error messages

