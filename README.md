# Zero Light Privy - Express TypeScript API

A modular Express.js application built with TypeScript, featuring clean architecture with separate routes and services layers, integrated with Supabase database.

## Project Structure

```
src/
├── app.ts                 # Main application entry point
├── config/
│   └── supabase.ts        # Supabase configuration
├── routes/
│   ├── helloRoutes.ts     # Hello world routes
│   └── userRoutes.ts      # User CRUD routes
├── services/
│   ├── helloService.ts    # Hello world business logic
│   └── databaseService.ts # Database operations
└── types/
    └── index.ts           # TypeScript type definitions
```

## Features

- ✅ TypeScript with strict type checking
- ✅ Modular architecture (routes + services)
- ✅ Express.js with middleware (helmet, cors, morgan)
- ✅ Environment variable support
- ✅ Error handling middleware
- ✅ Health check endpoint
- ✅ Hello world API endpoints
- ✅ Supabase database integration
- ✅ User CRUD operations
- ✅ Database connection testing

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run dev:watch` - Alternative development command

## API Endpoints

### Health Check
- **GET** `/health` - Server health status

### Hello World
- **GET** `/api/hello` - Basic hello world message
- **GET** `/api/hello/:name` - Personalized hello message

### User Management
- **GET** `/api/users` - Get all users
- **GET** `/api/users/:id` - Get user by ID
- **GET** `/api/users/by-email-address` - Get user by email and address combination
- **POST** `/api/users` - Create new user
- **PUT** `/api/users/:id` - Update user
- **DELETE** `/api/users/:id` - Delete user
- **GET** `/api/users/health/database` - Database health check

### Device Management
- **GET** `/api/devices` - Get all devices
- **GET** `/api/devices/:id` - Get device by ID
- **GET** `/api/devices/user/:userid` - Get devices by userid
- **GET** `/api/devices/by-device-id/:device_id` - Get device by device_id
- **POST** `/api/devices` - Create new device
- **PUT** `/api/devices/:id` - Update device
- **PATCH** `/api/devices/:id/status` - Update device status
- **DELETE** `/api/devices/:id` - Delete device
- **GET** `/api/devices/health/database` - Database health check

### Private Beta Referral System
- **POST** `/api/private-beta/referral` - Create new unique 6-digit numeric referral key
- **POST** `/api/private-beta/verify` - Verify referral key and activate user
- **POST** `/api/private-beta/status` - Check user status by email
- **GET** `/api/private-beta/users` - Get all private beta users (admin)
- **GET** `/api/private-beta/health` - Private beta service health check

## Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3000

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important**: Replace the Supabase values with your actual project credentials from the Supabase dashboard.

## Development

The project uses TypeScript with strict type checking. All source files are in the `src/` directory and will be compiled to the `dist/` directory.

### Type Safety

- Strict TypeScript configuration
- Type definitions in `src/types/`
- Interface definitions for API responses
- Proper error handling with typed responses

### Architecture

- **Routes**: Handle HTTP requests and responses
- **Services**: Contain business logic and data processing
- **Config**: Database and external service configurations
- **Types**: Centralized TypeScript type definitions
- **Middleware**: Security, logging, and error handling

## Supabase Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Settings > API

### 2. Create Database Tables
Run this SQL in your Supabase SQL editor:

```sql
-- Create users table with unique constraint on (email, user_address)
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  user_address VARCHAR(255) NOT NULL,
  userid VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on email and user_address combination
CREATE UNIQUE INDEX users_email_address_unique ON users (email, user_address);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_user_address ON users (user_address);
CREATE INDEX idx_users_created_at ON users (created_at);

-- Create devices table
CREATE TABLE devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userid VARCHAR(255) NOT NULL,
  pushtoken VARCHAR(500) NOT NULL,
  installation_time VARCHAR(255) NOT NULL,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  status INTEGER NOT NULL CHECK (status IN (0, 1)),
  deviceinfo JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for devices table
CREATE INDEX idx_devices_userid ON devices (userid);
CREATE INDEX idx_devices_device_id ON devices (device_id);
CREATE INDEX idx_devices_platform ON devices (platform);
CREATE INDEX idx_devices_status ON devices (status);
CREATE INDEX idx_devices_created_at ON devices (created_at);

-- Create private_beta_users table
CREATE TABLE private_beta_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_key VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  user_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_private_beta_users_updated_at 
  BEFORE UPDATE ON private_beta_users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

### 3. Test Database Connection
```bash
curl "http://localhost:3000/api/users/health/database"
curl "http://localhost:3000/api/private-beta/health"
```

## Private Beta Referral System

### Overview
The private beta referral system allows you to create unique 6-digit numeric referral codes that users can use to gain access to your private beta. Each code is guaranteed to be unique and can only be used once.

### Key Features
- **Unique 6-digit numeric codes** (0-9)
- **One-time use** - each code can only be used once
- **Email tracking** - tracks which email used each code
- **Status management** - pending/active status tracking
- **Collision-resistant** - 1 million possible combinations

### API Usage Examples

#### 1. Create a New Referral Key
```bash
curl -X POST "http://localhost:3000/api/private-beta/referral" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "referral_key": "123456",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Referral key created successfully"
}
```

#### 2. Verify Referral Key (User Registration)
```bash
curl -X POST "http://localhost:3000/api/private-beta/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "referral_key": "123456",
    "user_email": "user@example.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "referral_key": "123456",
    "status": "active",
    "user_email": "user@example.com",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Referral key verified and user activated successfully"
}
```

#### 3. Check User Status
```bash
curl -X POST "http://localhost:3000/api/private-beta/status" \
  -H "Content-Type: application/json" \
  -d '{"user_email": "user@example.com"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "referral_key": "123456",
    "status": "active",
    "user_email": "user@example.com",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "User status retrieved successfully"
}
```

#### 4. Get All Private Beta Users (Admin)
```bash
curl "http://localhost:3000/api/private-beta/users"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "referral_key": "123456",
      "status": "active",
      "user_email": "user@example.com",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Error Handling

#### Invalid Referral Key
```json
{
  "success": false,
  "error": "Verification failed",
  "message": "Invalid or already used referral key"
}
```

#### Email Already Registered
```json
{
  "success": false,
  "error": "Verification failed",
  "message": "Email already registered"
}
```

#### User Not Found
```json
{
  "success": false,
  "error": "User not found",
  "message": "User not found"
}
```

### Integration Flow

1. **Admin creates referral keys** using the `/referral` endpoint
2. **Share the `referral_key`** with potential beta users
3. **Users verify their access** using the `/verify` endpoint with their email
4. **Check user status** using the `/status` endpoint
5. **Monitor all users** using the `/users` endpoint

### Key Characteristics
- **Referral codes are 6 digits long**
- **Only numbers (0-9)**
- **Each code is unique across the entire system**
- **Codes can only be used once**
- **Email addresses are tracked for each used code**
- **Status changes from 'pending' to 'active' when used**

## User Management System

### Overview
The user management system provides full CRUD operations for users with a unique constraint on the combination of email and user_address. This ensures that no two users can have the same email AND address combination.

### Key Features
- **Unique constraint** on (email, user_address) combination
- **Full CRUD operations** - Create, Read, Update, Delete
- **Email validation** with regex pattern matching
- **Address validation** ensuring string type
- **Automatic timestamps** for created_at and updated_at
- **Comprehensive error handling** with detailed messages

### API Usage Examples

#### 1. Create a New User
```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "user_address": "0x1234567890abcdef1234567890abcdef12345678",
    "userid": "john_doe_123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "john.doe@example.com",
    "user_address": "0x1234567890abcdef1234567890abcdef12345678",
    "userid": "john_doe_123",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "User created successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Get All Users
```bash
curl "http://localhost:3000/api/users"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "john.doe@example.com",
      "user_address": "0x1234567890abcdef1234567890abcdef12345678",
      "userid": "john_doe_123",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3. Get User by ID
```bash
curl "http://localhost:3000/api/users/123e4567-e89b-12d3-a456-426614174000"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "john.doe@example.com",
    "user_address": "0x1234567890abcdef1234567890abcdef12345678",
    "userid": "john_doe_123",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 4. Get User by Email and Address
```bash
curl "http://localhost:3000/api/users/by-email-address?email=john.doe@example.com&user_address=0x1234567890abcdef1234567890abcdef12345678"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "john.doe@example.com",
    "user_address": "0x1234567890abcdef1234567890abcdef12345678",
    "userid": "john_doe_123",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 5. Update User
```bash
curl -X PUT "http://localhost:3000/api/users/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "userid": "john_smith_456",
    "email": "john.smith@example.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "john.smith@example.com",
    "user_address": "0x1234567890abcdef1234567890abcdef12345678",
    "userid": "john_smith_456",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:01:00.000Z"
  },
  "message": "User updated successfully",
  "timestamp": "2024-01-01T00:01:00.000Z"
}
```

#### 6. Delete User
```bash
curl -X DELETE "http://localhost:3000/api/users/123e4567-e89b-12d3-a456-426614174000"
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "timestamp": "2024-01-01T00:02:00.000Z"
}
```

#### 7. Database Health Check
```bash
curl "http://localhost:3000/api/users/health/database"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "Supabase",
    "connected": true,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Handling Examples

#### Duplicate Email and Address Combination
```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "user_address": "0x1234567890abcdef1234567890abcdef12345678",
    "userid": "jane_doe_789"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Failed to create user",
  "message": "User with this email and address combination already exists"
}
```

#### Invalid Email Format
```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "user_address": "0x1234567890abcdef1234567890abcdef12345678",
    "userid": "john_doe_123"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Invalid email format",
  "message": "Please provide a valid email address"
}
```

#### Missing Required Fields
```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "userid": "john_doe_123"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Invalid user address",
  "message": "User address is required and must be a string"
}
```

### User Schema
- **id**: UUID (auto-generated primary key)
- **email**: String (required, validated with regex)
- **user_address**: String (required)
- **userid**: String (required)
- **created_at**: Timestamp (auto-generated)
- **updated_at**: Timestamp (auto-updated)

### Unique Constraint
The combination of `email` and `user_address` must be unique across all users. This means:
- ✅ Same email with different addresses is allowed
- ✅ Same address with different emails is allowed  
- ❌ Same email AND same address combination is not allowed

## Device Management System

### Overview
The device management system provides full CRUD operations for devices associated with users. Each device has a unique device_id and stores push notification tokens, installation information, and device details.

### Key Features
- **Unique device_id** constraint ensuring no duplicate devices
- **User validation** - device can only be created if userid exists in users table
- **Status management** - when device is created/updated with status 1, all other devices for that user are set to status 0
- **Full CRUD operations** - Create, Read, Update, Delete
- **Status management** with binary values (1 = active, 0 = inactive)
- **Device information** stored as flexible JSON object
- **User association** via userid field
- **Push token management** for notifications
- **Comprehensive error handling** with detailed messages

### API Usage Examples

#### 1. Create a New Device
```bash
curl -X POST "http://localhost:3000/api/devices" \
  -H "Content-Type: application/json" \
  -d '{
    "userid": "john_doe_123",
    "pushtoken": "fcm_token_example_123456789",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_12345",
    "platform": "ios",
    "status": 1,
    "deviceinfo": {
      "version": "17.2",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "osVersion": "17.2.1",
      "appVersion": "1.0.0",
      "batteryLevel": 85,
      "isConnected": true
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "userid": "john_doe_123",
    "pushtoken": "fcm_token_example_123456789",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_12345",
    "platform": "ios",
    "status": 1,
    "deviceinfo": {
      "version": "17.2",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "osVersion": "17.2.1",
      "appVersion": "1.0.0",
      "batteryLevel": 85,
      "isConnected": true
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Device created successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Get All Devices
```bash
curl "http://localhost:3000/api/devices"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "userid": "john_doe_123",
      "pushtoken": "fcm_token_example_123456789",
      "installation_time": "2024-01-01T00:00:00.000Z",
      "device_id": "device_12345",
      "status": 1,
      "deviceInfo": {
        "platform": "iOS",
        "version": "17.2",
        "model": "iPhone 15 Pro",
        "manufacturer": "Apple",
        "os": "iOS",
        "osVersion": "17.2.1",
        "appVersion": "1.0.0"
      },
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3. Get Device by ID
```bash
curl "http://localhost:3000/api/devices/456e7890-e89b-12d3-a456-426614174001"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "userid": "john_doe_123",
    "pushtoken": "fcm_token_example_123456789",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_12345",
    "platform": "ios",
    "status": 1,
    "deviceinfo": {
      "version": "17.2",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "osVersion": "17.2.1",
      "appVersion": "1.0.0",
      "batteryLevel": 85,
      "isConnected": true
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 4. Get Devices by User ID
```bash
curl "http://localhost:3000/api/devices/user/john_doe_123"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "userid": "john_doe_123",
      "pushtoken": "fcm_token_example_123456789",
      "installation_time": "2024-01-01T00:00:00.000Z",
      "device_id": "device_12345",
      "status": 1,
      "deviceInfo": {
        "platform": "iOS",
        "version": "17.2",
        "model": "iPhone 15 Pro",
        "manufacturer": "Apple",
        "os": "iOS",
        "osVersion": "17.2.1",
        "appVersion": "1.0.0"
      },
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 5. Get Device by Device ID
```bash
curl "http://localhost:3000/api/devices/by-device-id/device_12345"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "userid": "john_doe_123",
    "pushtoken": "fcm_token_example_123456789",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_12345",
    "platform": "ios",
    "status": 1,
    "deviceinfo": {
      "version": "17.2",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "osVersion": "17.2.1",
      "appVersion": "1.0.0",
      "batteryLevel": 85,
      "isConnected": true
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 5. Find Device by Multiple Parameters
```bash
curl "http://localhost:3000/api/devices/find?device_id=device_12345&userid=john_doe_123&installation_time=2024-01-01T00:00:00.000Z"
```

**Response (Device Found):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userid": "john_doe_123",
    "pushtoken": "fcm_token_example_123456789",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_12345",
    "platform": "ios",
    "status": 1,
    "deviceinfo": {
      "version": "17.2",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "osVersion": "17.2.1",
      "appVersion": "1.0.0",
      "batteryLevel": 85,
      "isConnected": true
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Device found",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Response (Device Not Found):**
```json
{
  "success": true,
  "data": false,
  "message": "Device not found",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 7. Update Device by Parameters
```bash
curl -X PUT "http://localhost:3000/api/devices/update-by-params?device_id=device_12345&userid=john_doe_123&installation_time=2024-01-01T00:00:00.000Z" \
  -H "Content-Type: application/json" \
  -d '{
    "status": 1,
    "pushtoken": "new_fcm_token_987654321",
    "deviceinfo": {
      "version": "17.3",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "osVersion": "17.3.1",
      "appVersion": "1.1.0",
      "batteryLevel": 90,
      "isConnected": true
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userid": "john_doe_123",
    "pushtoken": "new_fcm_token_987654321",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_12345",
    "platform": "ios",
    "status": 1,
    "deviceinfo": {
      "version": "17.3",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "osVersion": "17.3.1",
      "appVersion": "1.1.0",
      "batteryLevel": 90,
      "isConnected": true
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  },
  "message": "Device updated successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Note:** When updating status to 1, all other devices for the same user are automatically set to status 0.

#### 8. Upsert Device (Update if exists, Create if not exists)
```bash
curl -X POST "http://localhost:3000/api/devices/upsert" \
  -H "Content-Type: application/json" \
  -d '{
    "userid": "john_doe_123",
    "pushtoken": "fcm_token_example_123456789",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_12345",
    "platform": "ios",
    "status": 1,
    "deviceinfo": {
      "version": "17.2",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "osVersion": "17.2.1",
      "appVersion": "1.0.0",
      "batteryLevel": 85,
      "isConnected": true
    }
  }'
```

**Response (Device Updated):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userid": "john_doe_123",
    "pushtoken": "fcm_token_example_123456789",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_12345",
    "platform": "ios",
    "status": 1,
    "deviceinfo": {
      "version": "17.2",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "osVersion": "17.2.1",
      "appVersion": "1.0.0",
      "batteryLevel": 85,
      "isConnected": true
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  },
  "message": "Device upserted successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Response (Device Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "userid": "john_doe_123",
    "pushtoken": "fcm_token_example_123456789",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_12345",
    "platform": "ios",
    "status": 1,
    "deviceinfo": {
      "version": "17.2",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "osVersion": "17.2.1",
      "appVersion": "1.0.0",
      "batteryLevel": 85,
      "isConnected": true
    },
    "created_at": "2024-01-01T12:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  },
  "message": "Device upserted successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Note:** 
- If device exists (same device_id, userid, installation_time), it will be updated
- If device doesn't exist, it will be created
- When status is 1, all other devices for the same user are automatically set to status 0

#### 9. Update Device
```bash
curl -X PUT "http://localhost:3000/api/devices/456e7890-e89b-12d3-a456-426614174001" \
  -H "Content-Type: application/json" \
  -d '{
    "pushtoken": "new_fcm_token_987654321",
    "deviceInfo": {
      "platform": "iOS",
      "version": "17.3",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "os": "iOS",
      "osVersion": "17.3.0",
      "appVersion": "1.1.0"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "userid": "john_doe_123",
    "pushtoken": "new_fcm_token_987654321",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_12345",
    "platform": "ios",
    "status": 1,
    "deviceInfo": {
      "platform": "iOS",
      "version": "17.3",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "os": "iOS",
      "osVersion": "17.3.0",
      "appVersion": "1.1.0"
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:01:00.000Z"
  },
  "message": "Device updated successfully",
  "timestamp": "2024-01-01T00:01:00.000Z"
}
```

#### 10. Update Device Status
```bash
curl -X PATCH "http://localhost:3000/api/devices/456e7890-e89b-12d3-a456-426614174001/status" \
  -H "Content-Type: application/json" \
  -d '{"status": 0}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "userid": "john_doe_123",
    "pushtoken": "new_fcm_token_987654321",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_12345",
    "status": 0,
    "deviceInfo": {
      "platform": "iOS",
      "version": "17.3",
      "model": "iPhone 15 Pro",
      "manufacturer": "Apple",
      "os": "iOS",
      "osVersion": "17.3.0",
      "appVersion": "1.1.0"
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:02:00.000Z"
  },
  "message": "Device status updated successfully",
  "timestamp": "2024-01-01T00:02:00.000Z"
}
```

#### 11. Delete Device
```bash
curl -X DELETE "http://localhost:3000/api/devices/456e7890-e89b-12d3-a456-426614174001"
```

**Response:**
```json
{
  "success": true,
  "message": "Device deleted successfully",
  "timestamp": "2024-01-01T00:03:00.000Z"
}
```

#### 12. Database Health Check
```bash
curl "http://localhost:3000/api/devices/health/database"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "Supabase",
    "connected": true,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Handling Examples

#### Duplicate Device ID
```bash
curl -X POST "http://localhost:3000/api/devices" \
  -H "Content-Type: application/json" \
  -d '{
    "userid": "jane_doe_789",
    "pushtoken": "fcm_token_example_999999999",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_12345",
    "platform": "ios",
    "status": 1,
    "deviceInfo": {
      "platform": "Android",
      "version": "14",
      "model": "Pixel 8"
    }
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Failed to create device",
  "message": "Device with this device_id already exists"
}
```

#### Invalid Status Value
```bash
curl -X POST "http://localhost:3000/api/devices" \
  -H "Content-Type: application/json" \
  -d '{
    "userid": "john_doe_123",
    "pushtoken": "fcm_token_example_123456789",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_67890",
    "status": 2,
    "deviceInfo": {
      "platform": "iOS"
    }
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Invalid status",
  "message": "Status must be either 1 or 0"
}
```

#### User Not Found
```bash
curl -X POST "http://localhost:3000/api/devices" \
  -H "Content-Type: application/json" \
  -d '{
    "userid": "non_existent_user",
    "pushtoken": "fcm_token_example_123456789",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_67890",
    "platform": "ios",
    "status": 1,
    "deviceinfo": {
      "version": "17.2"
    }
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Failed to create device",
  "message": "User not found"
}
```

#### Invalid Platform Value
```bash
curl -X POST "http://localhost:3000/api/devices" \
  -H "Content-Type: application/json" \
  -d '{
    "userid": "john_doe_123",
    "pushtoken": "fcm_token_example_123456789",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_67890",
    "platform": "windows",
    "status": 1,
    "deviceInfo": {
      "platform": "iOS"
    }
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Invalid platform",
  "message": "Platform is required and must be either \"ios\" or \"android\""
}
```

#### Invalid Deviceinfo Type
```bash
curl -X POST "http://localhost:3000/api/devices" \
  -H "Content-Type: application/json" \
  -d '{
    "userid": "john_doe_123",
    "pushtoken": "fcm_token_example_123456789",
    "installation_time": "2024-01-01T00:00:00.000Z",
    "device_id": "device_67890",
    "platform": "ios",
    "status": 1,
    "deviceinfo": "this should be an object, not a string"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Invalid deviceinfo",
  "message": "Deviceinfo is required and must be an object (not array or primitive)"
}
```

### Device Schema
- **id**: UUID (auto-generated primary key)
- **userid**: String (required, references user)
- **pushtoken**: String (required, for push notifications)
- **installation_time**: String (required, ISO timestamp)
- **device_id**: String (required, unique identifier)
- **platform**: String (required, must be "ios" or "android")
- **status**: Integer (required, 1 = active, 0 = inactive)
- **deviceinfo**: JSON Object (required, flexible device information)
- **created_at**: Timestamp (auto-generated)
- **updated_at**: Timestamp (auto-updated)

### Device Info Object Structure
The `deviceinfo` field is a completely flexible JSON object that can contain ANY properties and values. It must be an object (not array or primitive), but the structure is entirely up to you:

**Example 1 - iOS Device:**
```json
{
  "version": "17.2",
  "model": "iPhone 15 Pro",
  "manufacturer": "Apple",
  "osVersion": "17.2.1",
  "appVersion": "1.0.0",
  "batteryLevel": 85,
  "isConnected": true
}
```

**Example 2 - Android Device:**
```json
{
  "version": "14",
  "model": "Pixel 8",
  "manufacturer": "Google",
  "osVersion": "14.0",
  "appVersion": "1.0.0",
  "batteryLevel": 92,
  "isConnected": true,
  "androidId": "abc123def456"
}
```

**Example 3 - Web Browser:**
```json
{
  "browser": "Chrome",
  "browserVersion": "120.0.6099.109",
  "userAgent": "Mozilla/5.0...",
  "screenResolution": "1920x1080",
  "timezone": "UTC-5"
}
```

**Example 4 - Custom Structure:**
```json
{
  "deviceType": "smartphone",
  "brand": "Samsung",
  "customField1": "any value",
  "customField2": 123,
  "customField3": true,
  "nestedObject": {
    "subProperty": "value"
  }
}
```

**Example 5 - Minimal Object:**
```json
{
  "name": "My Device"
}
```

**Example 6 - Empty Object:**
```json
{}
```

### Unique Constraints
- **device_id** must be unique across all devices
- Multiple devices can belong to the same user (same userid)
- Each device can only have one active record

### Status Management Rules
- **Only one device per user can have status 1 (active)**
- When creating a device with status 1, all other devices for that user are automatically set to status 0
- When updating a device to status 1, all other devices for that user are automatically set to status 0
- When updating device status to 1 via PATCH endpoint, all other devices for that user are automatically set to status 0
- Multiple devices can have status 0 (inactive) for the same user

### User Validation Rules
- **Device can only be created if userid exists in users table**
- The userid field must reference a valid user from the users collection
- If userid doesn't exist, device creation will fail with "User not found" error

# zeroLight-backend
