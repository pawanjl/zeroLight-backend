# Zero Light Backend - API Documentation

Complete API reference with curl examples and response types.

## Base URL

```
http://localhost:3000
```

---

## Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [Session Management](#session-management)
- [Notification Preferences](#notification-preferences)
- [Private Beta](#private-beta)
- [Health Check](#health-check)
- [Response Types](#response-types)
- [Error Codes](#error-codes)

---

## Authentication

Currently, all endpoints are public. Add authentication middleware as needed.

---

## User Management

Base path: `/api/v1/users`

### Create User

Create a new user with Privy ID.

**Endpoint:** `POST /api/v1/users`

**Request Body:**
```json
{
  "privyId": "string (required)",
  "email": "string (optional)",
  "phone": "string (optional)",
  "walletAddress": "string (optional, 0x...)"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "privyId": "privy_user_123",
    "email": "user@example.com",
    "phone": "+1234567890",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "privyId": "privy_user_123",
    "email": "user@example.com",
    "phone": "+1234567890",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "walletRegisteredAt": "2025-10-16T21:59:48.560Z",
    "createdAt": "2025-10-16T21:59:48.562Z",
    "updatedAt": "2025-10-16T21:59:48.562Z",
    "lastActiveAt": null,
    "status": "active",
    "version": 0,
    "sessions": []
  },
  "message": "User created successfully",
  "timestamp": "2025-10-16T21:59:55.112Z"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "User with this Privy ID already exists",
  "message": "User with this Privy ID already exists"
}
```

---

### Get All Users

Get paginated list of users.

**Endpoint:** `GET /api/v1/users?page=1&limit=50`

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 50, max: 100)

**Curl Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/users?page=1&limit=10"
```

**Success Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "privyId": "privy_user_123",
      "email": "user@example.com",
      "phone": "+1234567890",
      "walletAddress": "0x742d35Cc...",
      "walletRegisteredAt": "2025-10-16T21:59:48.560Z",
      "createdAt": "2025-10-16T21:59:48.562Z",
      "updatedAt": "2025-10-16T21:59:48.562Z",
      "lastActiveAt": null,
      "status": "active",
      "version": 0,
      "sessions": []
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 10,
  "timestamp": "2025-10-16T22:00:10.966Z"
}
```

---

### Get User by ID

**Endpoint:** `GET /api/v1/users/:id`

**Curl Example:**
```bash
curl -X GET http://localhost:3000/api/v1/users/{userId}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "privyId": "privy_user_123",
    "email": "user@example.com",
    "phone": "+1234567890",
    "walletAddress": "0x742d35Cc...",
    "walletRegisteredAt": "2025-10-16T21:59:48.560Z",
    "createdAt": "2025-10-16T21:59:48.562Z",
    "updatedAt": "2025-10-16T21:59:48.562Z",
    "lastActiveAt": null,
    "status": "active",
    "version": 0,
    "sessions": []
  },
  "timestamp": "2025-10-16T22:00:13.241Z"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "User not found",
  "message": "User not found"
}
```

---

### Get User by Privy ID

**Endpoint:** `GET /api/v1/users/privy/:privyId`

**Curl Example:**
```bash
curl -X GET http://localhost:3000/api/v1/users/privy/privy_user_123
```

**Response:** Same as Get User by ID

---

### Get User by Wallet Address

**Endpoint:** `GET /api/v1/users/wallet/:walletAddress`

**Curl Example:**
```bash
curl -X GET http://localhost:3000/api/v1/users/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**Response:** Same as Get User by ID

---

### Update User

Update user information with optimistic locking.

**Endpoint:** `PUT /api/v1/users/:id`

**Request Body:**
```json
{
  "email": "string (optional)",
  "phone": "string (optional)",
  "walletAddress": "string (optional)",
  "status": "string (optional: active|inactive|suspended)",
  "version": "number (optional, for optimistic locking)"
}
```

**Curl Example:**
```bash
curl -X PUT http://localhost:3000/api/v1/users/{userId} \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "phone": "+1987654321",
    "version": 0
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "privyId": "privy_user_002",
    "email": "newemail@example.com",
    "phone": "+1987654321",
    "walletAddress": null,
    "walletRegisteredAt": null,
    "createdAt": "2025-10-16T21:59:56.190Z",
    "updatedAt": "2025-10-16T22:00:50.539Z",
    "lastActiveAt": null,
    "status": "active",
    "version": 1,
    "sessions": []
  },
  "message": "User updated successfully",
  "timestamp": "2025-10-16T22:00:57.464Z"
}
```

**Error Response (409):**
```json
{
  "success": false,
  "error": "Conflict",
  "message": "Version mismatch. User has been updated by another request."
}
```

---

### Register Wallet

Register or update wallet address for a user.

**Endpoint:** `POST /api/v1/users/:id/wallet`

**Request Body:**
```json
{
  "walletAddress": "string (required, 0x...)"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:3000/api/v1/users/{userId}/wallet \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x8Ba1f109551bD432803012645Ac136ddd64DBA72"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "privyId": "privy_user_002",
    "email": "user@example.com",
    "phone": "+1234567890",
    "walletAddress": "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
    "walletRegisteredAt": "2025-10-16T22:01:01.086Z",
    "createdAt": "2025-10-16T21:59:56.190Z",
    "updatedAt": "2025-10-16T22:01:00.005Z",
    "lastActiveAt": null,
    "status": "active",
    "version": 2,
    "sessions": []
  },
  "message": "Wallet registered successfully",
  "timestamp": "2025-10-16T22:01:05.717Z"
}
```

---

### Update Last Active

Update user's last active timestamp.

**Endpoint:** `POST /api/v1/users/:id/activity`

**Curl Example:**
```bash
curl -X POST http://localhost:3000/api/v1/users/{userId}/activity
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Activity updated successfully",
  "timestamp": "2025-10-16T22:01:06.779Z"
}
```

---

### Delete User

Soft delete a user (sets status to 'inactive').

**Endpoint:** `DELETE /api/v1/users/:id`

**Curl Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/users/{userId}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "timestamp": "2025-10-16T22:01:10.123Z"
}
```

---

## Session Management

Base path: `/api/v1/sessions`

### Create Session

Create a new session with idempotency support.

**Endpoint:** `POST /api/v1/sessions`

**Request Body:**
```json
{
  "userId": "string (required)",
  "deviceId": "string (required)",
  "deviceName": "string (optional)",
  "deviceModel": "string (optional)",
  "platform": "string (required: ios|android|web)",
  "osVersion": "string (optional)",
  "appVersion": "string (optional)",
  "pushToken": "string (optional)",
  "idempotencyKey": "string (optional, for idempotency)",
  "expiresInDays": "number (optional, default: 30)"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "deviceId": "device_ios_001",
    "deviceName": "iPhone 14 Pro",
    "deviceModel": "iPhone14,3",
    "platform": "ios",
    "osVersion": "17.0",
    "appVersion": "1.0.0",
    "pushToken": "apns_token_here",
    "idempotencyKey": "unique_key_123",
    "expiresInDays": 30
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "deviceId": "device_ios_001",
    "deviceName": "iPhone 14 Pro",
    "deviceModel": "iPhone14,3",
    "platform": "ios",
    "osVersion": "17.0",
    "appVersion": "1.0.0",
    "pushToken": "apns_token_here",
    "pushTokenUpdatedAt": "2025-10-16T22:00:20.556Z",
    "isActive": true,
    "ipAddress": "::1",
    "idempotencyKey": "unique_key_123",
    "createdAt": "2025-10-16T22:00:20.557Z",
    "lastActivityAt": "2025-10-16T22:00:20.557Z",
    "expiresAt": "2025-11-15T22:00:20.556Z",
    "terminatedAt": null,
    "terminationReason": null
  },
  "message": "Session created successfully",
  "timestamp": "2025-10-16T22:00:24.293Z"
}
```

---

### Get All Sessions

Get information about available session endpoints.

**Endpoint:** `GET /api/v1/sessions`

**Curl Example:**
```bash
curl -X GET http://localhost:3000/api/v1/sessions
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Use /api/v1/sessions/user/:userId to get sessions for a specific user",
  "endpoints": {
    "getUserSessions": "/api/v1/sessions/user/:userId",
    "getSession": "/api/v1/sessions/:id",
    "sessionStats": "/api/v1/sessions/user/:userId/stats"
  }
}
```

---

### Get Session by ID

**Endpoint:** `GET /api/v1/sessions/:id`

**Curl Example:**
```bash
curl -X GET http://localhost:3000/api/v1/sessions/{sessionId}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "deviceId": "device_ios_001",
    "deviceName": "iPhone 14 Pro",
    "deviceModel": "iPhone14,3",
    "platform": "ios",
    "osVersion": "17.0",
    "appVersion": "1.0.0",
    "pushToken": "apns_token",
    "pushTokenUpdatedAt": "2025-10-16T22:00:20.556Z",
    "isActive": true,
    "ipAddress": "::1",
    "idempotencyKey": "unique_key_123",
    "createdAt": "2025-10-16T22:00:20.557Z",
    "lastActivityAt": "2025-10-16T22:00:20.557Z",
    "expiresAt": "2025-11-15T22:00:20.556Z",
    "terminatedAt": null,
    "terminationReason": null
  },
  "timestamp": "2025-10-16T22:00:37.011Z"
}
```

---

### Get User Sessions

Get all sessions for a specific user.

**Endpoint:** `GET /api/v1/sessions/user/:userId?includeInactive=false`

**Query Parameters:**
- `includeInactive` (optional, default: false) - Include terminated sessions

**Curl Example:**
```bash
# Active sessions only
curl -X GET http://localhost:3000/api/v1/sessions/user/{userId}

# Include inactive sessions
curl -X GET "http://localhost:3000/api/v1/sessions/user/{userId}?includeInactive=true"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "user-uuid",
      "deviceId": "device_android_001",
      "deviceName": "Pixel 7",
      "deviceModel": "Pixel 7",
      "platform": "android",
      "osVersion": "14.0",
      "appVersion": "1.0.0",
      "pushToken": "fcm_token",
      "pushTokenUpdatedAt": "2025-10-16T22:00:30.179Z",
      "isActive": true,
      "ipAddress": "::1",
      "idempotencyKey": null,
      "createdAt": "2025-10-16T22:00:30.179Z",
      "lastActivityAt": "2025-10-16T22:00:30.179Z",
      "expiresAt": "2025-11-15T22:00:30.179Z",
      "terminatedAt": null,
      "terminationReason": null
    }
  ],
  "count": 1,
  "timestamp": "2025-10-16T22:00:38.108Z"
}
```

---

### Update Session

Update session information.

**Endpoint:** `PUT /api/v1/sessions/:id`

**Request Body:**
```json
{
  "deviceName": "string (optional)",
  "deviceModel": "string (optional)",
  "osVersion": "string (optional)",
  "appVersion": "string (optional)",
  "pushToken": "string (optional)"
}
```

**Curl Example:**
```bash
curl -X PUT http://localhost:3000/api/v1/sessions/{sessionId} \
  -H "Content-Type: application/json" \
  -d '{
    "deviceName": "iPhone 14 Pro (Updated)",
    "appVersion": "1.1.0"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "deviceId": "device_ios_001",
    "deviceName": "iPhone 14 Pro (Updated)",
    "deviceModel": "iPhone14,3",
    "platform": "ios",
    "osVersion": "17.0",
    "appVersion": "1.1.0",
    "pushToken": "apns_token",
    "pushTokenUpdatedAt": "2025-10-16T22:00:20.556Z",
    "isActive": true,
    "ipAddress": "::1",
    "idempotencyKey": "unique_key_123",
    "createdAt": "2025-10-16T22:00:20.557Z",
    "lastActivityAt": "2025-10-16T22:00:38.133Z",
    "expiresAt": "2025-11-15T22:00:20.556Z",
    "terminatedAt": null,
    "terminationReason": null
  },
  "message": "Session updated successfully",
  "timestamp": "2025-10-16T22:00:39.172Z"
}
```

---

### Update Push Token

Update push notification token for a session.

**Endpoint:** `PUT /api/v1/sessions/:id/push-token`

**Request Body:**
```json
{
  "pushToken": "string (required)"
}
```

**Curl Example:**
```bash
curl -X PUT http://localhost:3000/api/v1/sessions/{sessionId}/push-token \
  -H "Content-Type: application/json" \
  -d '{
    "pushToken": "new_push_token_here"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "pushToken": "new_push_token_here",
    "pushTokenUpdatedAt": "2025-10-16T22:00:39.204Z",
    "...": "..."
  },
  "message": "Push token updated successfully",
  "timestamp": "2025-10-16T22:00:40.787Z"
}
```

---

### Update Session Activity

Update session's last activity timestamp (heartbeat).

**Endpoint:** `POST /api/v1/sessions/:id/activity`

**Curl Example:**
```bash
curl -X POST http://localhost:3000/api/v1/sessions/{sessionId}/activity
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Activity updated successfully",
  "timestamp": "2025-10-16T22:00:41.850Z"
}
```

---

### Extend Session

Extend session expiration time.

**Endpoint:** `POST /api/v1/sessions/:id/extend`

**Request Body:**
```json
{
  "additionalDays": "number (optional, default: 30)"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:3000/api/v1/sessions/{sessionId}/extend \
  -H "Content-Type: application/json" \
  -d '{
    "additionalDays": 15
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "expiresAt": "2025-11-30T22:00:20.556Z",
    "...": "..."
  },
  "message": "Session extended successfully",
  "timestamp": "2025-10-16T22:00:43.434Z"
}
```

---

### Terminate Session

Terminate a single session.

**Endpoint:** `DELETE /api/v1/sessions/:id`

**Request Body:**
```json
{
  "reason": "string (optional, default: user_logout)"
}
```

**Curl Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/sessions/{sessionId} \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "user_logout"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Session terminated successfully",
  "timestamp": "2025-10-16T22:01:12.623Z"
}
```

---

### Terminate All User Sessions

Terminate all sessions for a user.

**Endpoint:** `DELETE /api/v1/sessions/user/:userId/all`

**Request Body:**
```json
{
  "reason": "string (optional, default: user_logout_all)"
}
```

**Curl Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/sessions/user/{userId}/all \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "security_logout"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "3 session(s) terminated successfully",
  "count": 3,
  "timestamp": "2025-10-16T22:01:15.123Z"
}
```

---

### Get Session Statistics

Get session statistics for a user.

**Endpoint:** `GET /api/v1/sessions/user/:userId/stats`

**Curl Example:**
```bash
curl -X GET http://localhost:3000/api/v1/sessions/user/{userId}/stats
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalSessions": 2,
    "activeSessions": 1,
    "deviceBreakdown": [
      {
        "platform": "android",
        "count": 1
      },
      {
        "platform": "ios",
        "count": 1
      }
    ]
  },
  "timestamp": "2025-10-16T22:00:48.499Z"
}
```

---

## Notification Preferences

Base path: `/api/v1/notifications`

### Get Notification Preferences

Get notification preferences for a user.

**Endpoint:** `GET /api/v1/notifications/user/:userId`

**Curl Example:**
```bash
curl -X GET http://localhost:3000/api/v1/notifications/user/{userId}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "pushEnabled": true,
    "emailEnabled": true,
    "smsEnabled": false,
    "transactionNotifications": true,
    "securityAlerts": true,
    "marketingUpdates": false,
    "productUpdates": true,
    "quietHoursEnabled": false,
    "quietHoursStart": null,
    "quietHoursEnd": null,
    "timezone": "UTC",
    "createdAt": "2025-10-16T22:05:56.440Z",
    "updatedAt": "2025-10-16T22:05:56.440Z"
  },
  "timestamp": "2025-10-16T22:05:57.840Z"
}
```

---

### Update Notification Preferences

Update notification preferences (partial update supported).

**Endpoint:** `PUT /api/v1/notifications/user/:userId`

**Request Body:**
```json
{
  "pushEnabled": "boolean (optional)",
  "emailEnabled": "boolean (optional)",
  "smsEnabled": "boolean (optional)",
  "transactionNotifications": "boolean (optional)",
  "securityAlerts": "boolean (optional)",
  "marketingUpdates": "boolean (optional)",
  "productUpdates": "boolean (optional)",
  "quietHoursEnabled": "boolean (optional)",
  "quietHoursStart": "string (optional, HH:mm:ss format)",
  "quietHoursEnd": "string (optional, HH:mm:ss format)",
  "timezone": "string (optional, e.g., America/New_York)"
}
```

**Curl Example:**
```bash
curl -X PUT http://localhost:3000/api/v1/notifications/user/{userId} \
  -H "Content-Type: application/json" \
  -d '{
    "pushEnabled": false,
    "emailEnabled": true,
    "marketingUpdates": true,
    "quietHoursEnabled": true,
    "quietHoursStart": "22:00:00",
    "quietHoursEnd": "08:00:00",
    "timezone": "America/New_York"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "pushEnabled": false,
    "emailEnabled": true,
    "smsEnabled": false,
    "transactionNotifications": true,
    "securityAlerts": true,
    "marketingUpdates": true,
    "productUpdates": true,
    "quietHoursEnabled": true,
    "quietHoursStart": "1970-01-01T22:00:00.000Z",
    "quietHoursEnd": "1970-01-01T08:00:00.000Z",
    "timezone": "America/New_York",
    "createdAt": "2025-10-16T22:05:56.440Z",
    "updatedAt": "2025-10-16T22:13:54.522Z"
  },
  "message": "Notification preferences updated successfully",
  "timestamp": "2025-10-16T22:13:54.603Z"
}
```

---

### Reset Notification Preferences

Reset notification preferences to default values.

**Endpoint:** `POST /api/v1/notifications/user/:userId/reset`

**Curl Example:**
```bash
curl -X POST http://localhost:3000/api/v1/notifications/user/{userId}/reset
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "pushEnabled": true,
    "emailEnabled": true,
    "smsEnabled": false,
    "transactionNotifications": true,
    "securityAlerts": true,
    "marketingUpdates": false,
    "productUpdates": true,
    "quietHoursEnabled": false,
    "quietHoursStart": null,
    "quietHoursEnd": null,
    "timezone": "UTC",
    "createdAt": "2025-10-16T22:05:56.440Z",
    "updatedAt": "2025-10-16T22:15:00.000Z"
  },
  "message": "Notification preferences reset to defaults",
  "timestamp": "2025-10-16T22:15:00.123Z"
}
```

---

## Private Beta

Base path: `/api/private-beta`

**Note:** These routes remain unchanged from the original implementation.

### Create Referral Key

Generate a new referral key for private beta access.

**Endpoint:** `POST /api/private-beta/referrals`

**Curl Example:**
```bash
curl -X POST http://localhost:3000/api/private-beta/referrals \
  -H "Content-Type: application/json"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Referral key created successfully",
  "referral_key": "089304"
}
```

---

### Verify Referral Key

Verify and activate a referral key with user email.

**Endpoint:** `POST /api/private-beta/verify`

**Request Body:**
```json
{
  "referral_key": "string (required)",
  "user_email": "string (required)"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:3000/api/private-beta/verify \
  -H "Content-Type: application/json" \
  -d '{
    "referral_key": "089304",
    "user_email": "newuser@example.com"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Referral key verified successfully",
  "user": {
    "id": "uuid",
    "referralKey": "089304",
    "status": "active",
    "userEmail": "newuser@example.com",
    "createdAt": "2025-10-16T22:01:07.825Z",
    "updatedAt": "2025-10-16T22:16:00.000Z"
  }
}
```

---

### Get User by Referral Key

**Endpoint:** `GET /api/private-beta/users/:referralKey`

**Curl Example:**
```bash
curl -X GET http://localhost:3000/api/private-beta/users/089304
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "referralKey": "089304",
    "status": "active",
    "userEmail": "user@example.com",
    "createdAt": "2025-10-16T22:01:07.825Z",
    "updatedAt": "2025-10-16T22:01:07.825Z"
  }
}
```

---

### Get All Private Beta Users

**Endpoint:** `GET /api/private-beta/users`

**Curl Example:**
```bash
curl -X GET http://localhost:3000/api/private-beta/users
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "referralKey": "089304",
      "status": "pending",
      "userEmail": null,
      "createdAt": "2025-10-16T22:01:07.825Z",
      "updatedAt": "2025-10-16T22:01:07.825Z"
    }
  ],
  "count": 1,
  "timestamp": "2025-10-16T22:01:09.966Z"
}
```

---

### Create Multiple Referral Keys (Bulk)

Generate multiple referral keys at once.

**Endpoint:** `POST /api/private-beta/referrals/bulk`

**Request Body:**
```json
{
  "count": "number (required, 1-100)"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:3000/api/private-beta/referrals/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully created 10 referral keys",
  "data": [
    {
      "id": "uuid",
      "referralKey": "089304",
      "status": "pending",
      "userEmail": null,
      "createdAt": "2025-10-16T22:01:07.825Z",
      "updatedAt": "2025-10-16T22:01:07.825Z"
    },
    {
      "id": "uuid",
      "referralKey": "123456",
      "status": "pending",
      "userEmail": null,
      "createdAt": "2025-10-16T22:01:07.825Z",
      "updatedAt": "2025-10-16T22:01:07.825Z"
    }
  ],
  "count": 10,
  "timestamp": "2025-10-16T22:01:09.966Z"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Count must be between 1 and 100"
}
```

---

### Get Unused Referral Keys

Get all unused (pending) referral keys from the database.

**Endpoint:** `GET /api/private-beta/referrals/unused`

**Curl Example:**
```bash
curl -X GET http://localhost:3000/api/private-beta/referrals/unused
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully retrieved unused referral keys",
  "data": [
    {
      "id": "uuid",
      "referralKey": "089304",
      "status": "pending",
      "userEmail": null,
      "createdAt": "2025-10-16T22:01:07.825Z",
      "updatedAt": "2025-10-16T22:01:07.825Z"
    },
    {
      "id": "uuid",
      "referralKey": "234567",
      "status": "pending",
      "userEmail": null,
      "createdAt": "2025-10-16T22:01:08.825Z",
      "updatedAt": "2025-10-16T22:01:08.825Z"
    }
  ],
  "count": 2,
  "timestamp": "2025-10-16T22:01:09.966Z"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Failed to fetch unused referral keys",
  "message": "Database connection error"
}
```

---

## Health Check

### Server Health

Check server and database health.

**Endpoint:** `GET /health`

**Curl Example:**
```bash
curl -X GET http://localhost:3000/health
```

**Success Response (200):**
```json
{
  "status": "OK",
  "message": "Server is running",
  "database": {
    "connected": true,
    "type": "PostgreSQL (Prisma)"
  },
  "timestamp": "2025-10-16T21:59:43.455Z"
}
```

**Unhealthy Response (503):**
```json
{
  "status": "Unhealthy",
  "message": "Server is running",
  "database": {
    "connected": false,
    "type": "PostgreSQL (Prisma)"
  },
  "timestamp": "2025-10-16T21:59:43.455Z"
}
```

---

## Response Types

### Standard Success Response

```typescript
{
  success: true,
  data: T,              // Resource data
  message?: string,     // Optional message
  timestamp: string     // ISO 8601 timestamp
}
```

### Standard Error Response

```typescript
{
  success: false,
  error: string,        // Error type
  message: string,      // Detailed error message
  timestamp?: string    // ISO 8601 timestamp
}
```

### Paginated Response

```typescript
{
  success: true,
  users: T[],           // Array of resources
  total: number,        // Total count
  page: number,         // Current page
  totalPages: number,   // Total pages
  timestamp: string     // ISO 8601 timestamp
}
```

---

## Error Codes

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `404` - Not Found
- `409` - Conflict (optimistic locking, duplicate)
- `500` - Internal Server Error
- `503` - Service Unavailable (database down)

### Common Error Messages

**User Errors:**
- `User with this Privy ID already exists`
- `User with this wallet address already exists`
- `User not found`
- `Version mismatch. User has been updated by another request.`

**Session Errors:**
- `User ID is required and must be a string`
- `Device ID is required and must be a string`
- `Platform must be either "ios", "android", or "web"`
- `Session not found`
- `Failed to acquire lock`

**Notification Errors:**
- `Quiet hours start and end times are required when quiet hours are enabled`
- `Failed to fetch preferences`
- `Failed to update preferences`

**Private Beta Errors:**
- `Referral code not found`
- `Referral code already used`
- `Invalid email format`

---

## Rate Limiting

Currently, no rate limiting is implemented. Add rate limiting middleware as needed for production.

---

## Testing

### Automated Test Suite

Run the complete test suite:

```bash
./api_test_requests.sh
```

This will:
- Create 3 test users
- Create multiple sessions (iOS, Android, Web)
- Test all CRUD operations
- Test notification preferences
- Test private beta endpoints

### Manual Testing

Use the examples in `CURL_EXAMPLES.md` for manual testing.

---

## Database Schema

All database tables and relationships are defined in:
- `prisma/schema.prisma` - Prisma schema
- `supabase_setup.sql` - SQL setup script for Supabase

Key features:
- ✅ UUID primary keys
- ✅ Optimistic locking (version field on users)
- ✅ Distributed locking (for race condition prevention)
- ✅ Idempotency support (for sessions)
- ✅ Partitioned activity logs (by month)
- ✅ Automatic timestamps
- ✅ Cascading deletes

---

## Development

### Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```env
DATABASE_URL="postgresql://..."
PORT=3000
NODE_ENV=development
```

3. Run Prisma migrations:
```bash
npx prisma generate
npx prisma migrate dev
```

4. Start the server:
```bash
npm start
```

### Build

```bash
npm run build
```

### Linting

```bash
npm run lint
```

---

## Architecture

### Concurrency & Race Conditions

- **Distributed Locking**: Uses `distributed_locks` table with 10 retries and 300ms delay
- **Optimistic Locking**: Version field on users prevents conflicting updates
- **Idempotency**: Sessions support idempotency keys to prevent duplicates
- **Connection Pooling**: Configured via `DATABASE_URL` query parameters

### Session Management

- Sessions expire after 30 days by default (configurable)
- Multiple sessions per user/device
- Automatic termination of old sessions when creating new ones
- Push token management
- Activity tracking (heartbeat)

### Notification System

- Per-user preferences
- Quiet hours support with timezone
- Multiple notification channels (push, email, SMS)
- Multiple notification types (transactions, security, marketing, etc.)

---

## Production Considerations

1. **Authentication**: Add JWT or OAuth middleware
2. **Rate Limiting**: Implement rate limiting per user/IP
3. **CORS**: Configure CORS for specific origins
4. **Logging**: Add structured logging (Winston, Pino)
5. **Monitoring**: Add APM (DataDog, New Relic)
6. **Caching**: Add Redis for session caching
7. **Load Balancing**: Use multiple instances behind load balancer
8. **Database**: Use connection pooling (Supabase Pooler or PgBouncer)

---

## Support

For issues or questions, please contact the development team.

**Version:** 1.0.0  
**Last Updated:** October 16, 2025

