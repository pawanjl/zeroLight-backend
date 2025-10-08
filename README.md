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
-- Create users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
# zeroLight-backend
