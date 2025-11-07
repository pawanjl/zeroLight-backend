/**
 * Global type definitions for the application
 */

// Environment variables interface
export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
  DATABASE_URL: string;
  DATABASE_CONNECTION_LIMIT?: string;
  DATABASE_CONNECTION_TIMEOUT?: string;
  
  // Authentication
  JWT_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  JWT_EXPIRES_IN?: string;
  JWT_REFRESH_EXPIRES_IN?: string;
  
  // Privy Configuration
  PRIVY_APP_ID?: string;
  PRIVY_APP_SECRET?: string;
  PRIVY_VERIFICATION_KEY?: string;
  
  // Other
  API_KEY?: string;
}

// Express Request extension for custom properties
// Note: The 'user' property is now defined in src/types/auth.ts
// to support the authentication system
declare global {
  namespace Express {
    interface Request {
      session?: {
        id: string;
        userId: string;
      };
    }
  }
}

// API Response types
export interface BaseResponse {
  success: boolean;
  timestamp?: string;
}

export interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  message?: string;
  data?: T;
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  error: string;
  message?: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Database response types
export interface DatabaseResponse<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// User types
export interface User {
  id: string;
  privyId: string;
  email: string | null;
  phone: string | null;
  walletAddress: string | null;
  walletRegisteredAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date | null;
  version: number;
}

export interface CreateUserData {
  privyId: string;
  email?: string;
  phone?: string;
  walletAddress?: string;
}

export interface UpdateUserData {
  email?: string;
  phone?: string;
  walletAddress?: string;
  status?: string;
  lastActiveAt?: Date;
}

// Session types
export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string | null;
  deviceModel: string | null;
  platform: string;
  osVersion: string | null;
  appVersion: string | null;
  pushToken: string | null;
  pushTokenUpdatedAt: Date | null;
  isActive: boolean;
  ipAddress: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  terminatedAt: Date | null;
  terminationReason: string | null;
}

export interface CreateSessionData {
  userId: string;
  deviceId: string;
  deviceName?: string | null;
  deviceModel?: string | null;
  platform: 'ios' | 'android';
  osVersion?: string | null;
  appVersion?: string | null;
  pushToken?: string | null;
  ipAddress?: string | null;
  idempotencyKey?: string | null;
  expiresInDays?: number;
}

export interface UpdateSessionData {
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string;
  ipAddress?: string;
}

// Notification Preferences types
export interface NotificationPreferences {
  userId: string;
  tradeExecutedEnabled: boolean;
  orderFilledEnabled: boolean;
  orderCancelledEnabled: boolean;
  positionLiquidatedEnabled: boolean;
  fundingPaymentEnabled: boolean;
  priceAlertEnabled: boolean;
  marginWarningEnabled: boolean;
  pushEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: Date | null;
  quietHoursEnd: Date | null;
  quietHoursTimezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateNotificationPreferencesData {
  tradeExecutedEnabled?: boolean;
  orderFilledEnabled?: boolean;
  orderCancelledEnabled?: boolean;
  positionLiquidatedEnabled?: boolean;
  fundingPaymentEnabled?: boolean;
  priceAlertEnabled?: boolean;
  marginWarningEnabled?: boolean;
  pushEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: Date;
  quietHoursEnd?: Date;
  quietHoursTimezone?: string;
}

// Activity Log types
export interface ActivityLog {
  id: string;
  userId: string;
  sessionId: string | null;
  action: string;
  metadata: any;
  ipAddress: string | null;
  createdAt: Date;
}

export interface CreateActivityLogData {
  userId: string;
  sessionId?: string | null;
  action: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
}

// Private Beta Users types (keeping for backward compatibility)
export interface PrivateBetaUser {
  id: string;
  referralKey: string;
  status: 'pending' | 'active';
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyReferralData {
  referral_key: string;
  user_email: string;
}

export interface CheckUserStatusData {
  user_email: string;
}

// Device types (legacy - keeping for backward compatibility)
export interface Device {
  id: string;
  userid: string;
  pushtoken: string;
  installation_time: string;
  device_id: string;
  platform: 'ios' | 'android';
  status: 1 | 0;
  deviceinfo: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateDeviceData {
  userid: string;
  pushtoken: string;
  installation_time: string;
  device_id: string;
  platform: 'ios' | 'android';
  status: 1 | 0;
  deviceinfo: Record<string, any>;
}

export interface UpdateDeviceData {
  userid?: string;
  pushtoken?: string;
  installation_time?: string;
  device_id?: string;
  platform?: 'ios' | 'android';
  status?: 1 | 0;
  deviceinfo?: Record<string, any>;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  timestamp?: string;
}

// Middleware types
export type AsyncMiddleware = (
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
) => Promise<void>;

export type ErrorMiddleware = (
  err: Error,
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
) => void;

// Lock types
export interface DistributedLock {
  lockKey: string;
  lockOwner: string;
  lockedAt: Date;
  expiresAt: Date;
}
