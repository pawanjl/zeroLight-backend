# Authentication System Setup Guide

## Overview

The Zero Light backend now has a complete authentication system that integrates with Privy for initial verification and issues JWT tokens for subsequent API calls.

## Architecture

### Two-Tier Authentication System

1. **Initial Authentication (Privy)**
   - Frontend authenticates user via Privy
   - Privy provides an access token
   
2. **Backend JWT System**
   - Exchange Privy token for backend JWT tokens
   - Use JWT for all subsequent API requests

### Token Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│    Privy     │────▶│   Backend   │
│  (React/RN) │     │ Auth Service │     │  (Express)  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                         │
       │  1. Login with Privy                   │
       │  2. Get Privy Token                    │
       │                                         │
       │  3. POST /api/auth/login               │
       │     { privyToken: "..." }              │
       ├────────────────────────────────────────▶│
       │                                         │
       │  4. Verify Privy Token                 │
       │  5. Create/Update User                 │
       │  6. Generate JWT Tokens                │
       │                                         │
       │◀────────────────────────────────────────┤
       │  { accessToken, refreshToken, user }   │
       │                                         │
       │  7. Store Tokens                       │
       │                                         │
       │  8. API Requests                       │
       │     Authorization: Bearer <accessToken>│
       ├────────────────────────────────────────▶│
       │                                         │
       │  9. Verify JWT                         │
       │ 10. Process Request                    │
       │                                         │
```

## Environment Setup

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/database?pgbouncer=true

# JWT Configuration
JWT_SECRET=your-super-secret-key-min-32-characters-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-characters-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Privy Configuration
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
PRIVY_VERIFICATION_KEY=your-privy-verification-key
```

### Getting Privy Credentials

1. Go to [Privy Dashboard](https://dashboard.privy.io)
2. Select your application
3. Navigate to **Settings** → **API Keys**
4. Copy:
   - **App ID** → `PRIVY_APP_ID`
   - **App Secret** → `PRIVY_APP_SECRET`
   - **Verification Key** → `PRIVY_VERIFICATION_KEY`

### JWT Secret Generation

Generate strong secrets for production:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## API Endpoints

### Public Endpoints (No Authentication Required)

#### 1. Login with Privy Token

**`POST /api/auth/login`**

Exchange a Privy access token for backend JWT tokens.

**Request:**
```json
{
  "privyToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceId": "device-uuid-123",        // Optional
  "deviceName": "iPhone 14 Pro",        // Optional
  "platform": "ios"                     // Optional: web, ios, android
}
```

**Response:**
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
    }
  },
  "message": "Login successful",
  "timestamp": "2025-11-06T10:30:00.000Z"
}
```

#### 2. Refresh Access Token

**`POST /api/auth/refresh`**

Get a new access token using a refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
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
  }
}
```

### Protected Endpoints (Authentication Required)

All protected endpoints require the JWT access token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 3. Get Current User

**`GET /api/auth/me`**

Get details of the currently authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "privyId": "did:privy:clxxx...",
    "email": "user@example.com",
    "status": "active",
    "activeSessions": [
      {
        "id": "session-uuid",
        "deviceName": "iPhone 14 Pro",
        "platform": "ios"
      }
    ]
  }
}
```

#### 4. Logout

**`POST /api/auth/logout`**

Logout and optionally terminate a session.

**Request:**
```json
{
  "sessionId": "session-uuid"  // Optional
}
```

## Frontend Integration

### React/React Native Example

```typescript
import axios from 'axios';

// 1. Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 2. Add interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Add interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          'http://localhost:3000/api/auth/refresh',
          { refreshToken }
        );
        
        localStorage.setItem('accessToken', data.data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
        
        originalRequest.headers.Authorization = `Bearer ${data.data.tokens.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// 4. Login function
export const loginWithPrivy = async (privyToken: string) => {
  const { data } = await api.post('/api/auth/login', {
    privyToken,
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
    platform: 'web'
  });
  
  // Store tokens
  localStorage.setItem('accessToken', data.data.tokens.accessToken);
  localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
  
  return data.data.user;
};

// 5. Use the authenticated API
export const getUserProfile = async () => {
  const { data } = await api.get('/api/v1/users/me');
  return data;
};
```

## Protected Routes

The following API routes are now protected and require authentication:

- `/api/v1/users/*` - User management
- `/api/v1/sessions/*` - Session management
- `/api/v1/notifications/*` - Notification preferences
- `/api/v1/activity-logs/*` - Activity logs

### Public Routes (No Auth Required)

- `/api/auth/*` - Authentication endpoints
- `/api/private-beta/*` - Private beta referrals
- `/health` - Health check

## Token Lifecycle

### Access Token
- **Default Expiry:** 1 hour
- **Purpose:** Used for API requests
- **Storage:** Memory or secure storage
- **Refresh:** Use refresh token to get new access token

### Refresh Token
- **Default Expiry:** 7 days
- **Purpose:** Get new access tokens
- **Storage:** Secure storage only (HttpOnly cookie for web, Keychain for mobile)
- **Rotation:** New refresh token issued on each refresh

## Security Best Practices

### 1. Token Storage

**Web (Browser)**
```javascript
// Access Token: Memory or sessionStorage
sessionStorage.setItem('accessToken', token);

// Refresh Token: HttpOnly Cookie (set by backend)
// Or secure localStorage with appropriate security measures
```

**React Native/Mobile**
```javascript
// Use secure storage
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('accessToken', token);
await SecureStore.setItemAsync('refreshToken', refreshToken);
```

### 2. HTTPS Only
Always use HTTPS in production to prevent token interception.

### 3. Token Expiry
Keep access tokens short-lived (default: 1 hour) to minimize risk if compromised.

### 4. Refresh Token Rotation
Implement refresh token rotation to detect token theft.

### 5. Rate Limiting
Implement rate limiting on authentication endpoints:

```typescript
// Example with express-rate-limit
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts'
});

app.use('/api/auth/login', authLimiter);
```

## Testing

### Test Login Flow

```bash
# 1. Get Privy token from frontend (after Privy login)
PRIVY_TOKEN="your-privy-token-here"

# 2. Login to backend
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"privyToken\": \"$PRIVY_TOKEN\",
    \"platform\": \"web\"
  }"

# 3. Extract access token from response
ACCESS_TOKEN="your-access-token-here"

# 4. Test protected endpoint
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 5. Test token refresh
REFRESH_TOKEN="your-refresh-token-here"

curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

## Troubleshooting

### Common Issues

#### 1. "Invalid Privy token" Error
- **Cause:** Token expired or invalid
- **Solution:** Get a fresh Privy token from the frontend

#### 2. "Unauthorized" on Protected Routes
- **Cause:** Missing or invalid JWT token
- **Solution:** Ensure Authorization header is set correctly

#### 3. "Token expired" Error
- **Cause:** Access token has expired
- **Solution:** Use refresh token to get a new access token

#### 4. Database Connection Issues
- **Cause:** Using Supabase session pooler
- **Solution:** Ensure `pgbouncer=true` parameter in DATABASE_URL

## Deployment Checklist

- [ ] Set strong JWT secrets (32+ characters)
- [ ] Configure Privy credentials from dashboard
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Configure secure token storage
- [ ] Set appropriate token expiry times
- [ ] Enable database connection pooling
- [ ] Test authentication flow end-to-end

## Support

For issues or questions:
- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference
- Review Privy documentation: https://docs.privy.io
- Check server logs for detailed error messages

## Next Steps

1. Set up environment variables
2. Test login flow locally
3. Integrate with your frontend
4. Implement token refresh logic
5. Add rate limiting
6. Deploy to production

