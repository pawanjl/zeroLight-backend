/**
 * Global type definitions for the application
 */

// Environment variables interface
export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  API_KEY?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

// Express Request extension for custom properties
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// API Response types
export interface BaseResponse {
  success: boolean;
  timestamp: string;
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

// Route parameter types
export interface HelloParams {
  name: string;
}

// Service method return types
export type ServiceMethod<T> = () => Promise<T>;
export type ServiceMethodWithParams<T, P> = (params: P) => Promise<T>;

// Database types
export interface DatabaseResponse<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface User {
  id: string;
  email: string;
  user_address: string;
  userid: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  user_address: string;
  userid: string;
}

export interface UpdateUserData {
  email?: string;
  user_address?: string;
  userid?: string;
}

// Device types
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

// Private Beta Users types
export interface PrivateBetaUser {
  id: string;
  referral_key: string;
  status: 'pending' | 'active';
  user_email?: string;
  created_at: string;
  updated_at: string;
}

export interface VerifyReferralData {
  referral_key: string;
  user_email: string;
}

export interface CheckUserStatusData {
  user_email: string;
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
