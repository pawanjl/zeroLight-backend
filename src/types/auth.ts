/**
 * Authentication Types
 * 
 * Type definitions for authentication system including
 * JWT payloads, login requests, and token responses.
 */

/**
 * JWT Access Token Payload
 */
export interface JWTPayload {
  userId: string;           // Our database user UUID
  privyId: string;          // Privy DID (e.g., did:privy:...)
  email?: string | undefined;
  walletAddress?: string | undefined;
  iat: number;              // Issued at (timestamp)
  exp: number;              // Expires at (timestamp)
}

/**
 * JWT Refresh Token Payload
 */
export interface RefreshTokenPayload {
  userId: string;
  privyId: string;
  tokenVersion: number;     // For token invalidation
  iat: number;
  exp: number;
}

/**
 * Login Request Body
 */
export interface LoginRequest {
  privyToken: string;       // Privy access token from frontend
  deviceId?: string;        // Optional device identifier
  deviceName?: string;
  platform?: string;
  pushToken?: string;       // Optional push notification token
}

/**
 * Token Response
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;        // Seconds until access token expires
  tokenType: 'Bearer';
}

/**
 * Auth Response
 */
export interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      privyId: string;
      email?: string | undefined;
      phone?: string | undefined;
      walletAddress?: string | undefined;
      displayName?: string | undefined;
      profilePictureUrl?: string | undefined;
    };
    tokens: TokenResponse;
    isNewUser: boolean;       // Indicates if this is a newly created user
    session?: {
      id: string;
      deviceId: string;
      platform: string;
    };
  };
  error?: string;
  message?: string;
}

/**
 * Refresh Token Request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Verified JWT User (attached to Express request)
 */
export interface AuthUser {
  id: string;               // User UUID (same as userId)
  userId: string;
  privyId: string;
  email?: string | undefined;
  walletAddress?: string | undefined;
}

/**
 * Privy Verified Claims
 */
export interface PrivyVerifiedClaims {
  userId: string;           // Privy's user ID (DID)
  appId: string;
  [key: string]: unknown;   // Other claims from Privy
}

// Extend Express Request type to include authenticated user
// Overrides the existing user type in src/types/index.ts
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

