import jwt from 'jsonwebtoken';
import { JWTPayload, RefreshTokenPayload, TokenResponse, AuthUser } from '../types/auth';

/**
 * Token Service
 * 
 * Handles JWT token generation, verification, and management.
 * Uses access tokens (short-lived) and refresh tokens (long-lived).
 */

// JWT Configuration from environment
const JWT_SECRET = process.env['JWT_SECRET'];
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'];
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env['JWT_REFRESH_EXPIRES_IN'] || '7d';

// Validation checks for required environment variables
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Run "npm run generate-secrets" to generate secure secrets.');
}

if (!JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required. Run "npm run generate-secrets" to generate secure secrets.');
}

// Warn if secrets are too short
if (JWT_SECRET.length < 32) {
  console.warn('⚠️  WARNING: JWT_SECRET is too short. Use at least 32 characters for production. Run "npm run generate-secrets" to generate secure secrets.');
}

if (JWT_REFRESH_SECRET.length < 32) {
  console.warn('⚠️  WARNING: JWT_REFRESH_SECRET is too short. Use at least 32 characters for production. Run "npm run generate-secrets" to generate secure secrets.');
}

// Production-specific checks
if (process.env['NODE_ENV'] === 'production') {
  if (JWT_SECRET === JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different in production!');
  }
  
  if (JWT_SECRET.length < 32 || JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT secrets must be at least 32 characters in production. Run "npm run generate-secrets" to generate secure secrets.');
  }
}

/**
 * Generate access token
 */
export const generateAccessToken = (payload: {
  userId: string;
  privyId: string;
  email?: string | undefined;
  walletAddress?: string | undefined;
}): string => {
  const tokenPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: payload.userId,
    privyId: payload.privyId,
    email: payload.email,
    walletAddress: payload.walletAddress
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  } as jwt.SignOptions);
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload: {
  userId: string;
  privyId: string;
  tokenVersion?: number;
}): string => {
  const tokenPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    userId: payload.userId,
    privyId: payload.privyId,
    tokenVersion: payload.tokenVersion || 0
  };

  return jwt.sign(tokenPayload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN
  } as jwt.SignOptions);
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (payload: {
  userId: string;
  privyId: string;
  email?: string | undefined;
  walletAddress?: string | undefined;
  tokenVersion?: number;
}): TokenResponse => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Calculate expiry in seconds
  const expiresIn = parseExpiry(JWT_EXPIRES_IN);

  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer'
  };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): { success: boolean; payload?: JWTPayload; error?: string } => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return {
      success: true,
      payload
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'Token expired'
      };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: 'Invalid token'
      };
    }
    return {
      success: false,
      error: 'Token verification failed'
    };
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { success: boolean; payload?: RefreshTokenPayload; error?: string } => {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
    return {
      success: true,
      payload
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'Refresh token expired'
      };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: 'Invalid refresh token'
      };
    }
    return {
      success: false,
      error: 'Refresh token verification failed'
    };
  }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): JWTPayload | RefreshTokenPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload | RefreshTokenPayload;
  } catch {
    return null;
  }
};

/**
 * Extract auth user from JWT payload
 */
export const extractAuthUser = (payload: JWTPayload): AuthUser => {
  return {
    id: payload.userId,
    userId: payload.userId,
    privyId: payload.privyId,
    email: payload.email,
    walletAddress: payload.walletAddress
  };
};

/**
 * Parse expiry string to seconds
 * Examples: '1h' -> 3600, '7d' -> 604800, '30m' -> 1800
 */
const parseExpiry = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) return 3600; // Default 1 hour

  const value = parseInt(match[1], 10);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400
  };

  return value * (multipliers[unit] ?? 3600);
};

/**
 * Get token expiry time from a JWT string
 */
export const getTokenExpiry = (token: string): Date | null => {
  const decoded = decodeToken(token);
  if (!decoded || !('exp' in decoded) || typeof decoded.exp !== 'number') return null;
  return new Date(decoded.exp * 1000);
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string | undefined): boolean => {
  if (!token) return true;
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return expiry.getTime() < Date.now();
};

