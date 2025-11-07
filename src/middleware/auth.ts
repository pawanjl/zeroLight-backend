import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractAuthUser } from '../services/tokenService';
import { AuthUser } from '../types/auth';

/**
 * Authentication Middleware
 * 
 * Verifies JWT access tokens and attaches authenticated user to request.
 * Protects routes from unauthorized access.
 */

/**
 * Main authentication middleware
 * Extracts and verifies JWT from Authorization header
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No authorization header provided'
      });
      return;
    }

    // Check Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid authorization header format. Expected: Bearer <token>'
      });
      return;
    }

    const token = parts[1];
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Token is missing'
      });
      return;
    }

    // Verify token
    const verificationResult = verifyAccessToken(token);

    if (!verificationResult.success || !verificationResult.payload) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: verificationResult.error || 'Invalid or expired token'
      });
      return;
    }

    // Attach user to request
    const authUser: AuthUser = extractAuthUser(verificationResult.payload);
    req.user = authUser;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but allows request to proceed either way
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      // No token provided, continue without user
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // Invalid format, continue without user
      next();
      return;
    }

    const token = parts[1];
    if (token) {
      const verificationResult = verifyAccessToken(token);

      if (verificationResult.success && verificationResult.payload) {
        // Valid token, attach user
        const authUser: AuthUser = extractAuthUser(verificationResult.payload);
        req.user = authUser;
      }
    }

    // Continue regardless of token validity
    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    // Continue without user on error
    next();
  }
};

/**
 * Require specific user
 * Ensures the authenticated user matches the userId in the request
 * Useful for user-specific endpoints
 */
export const requireSelfOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return;
  }

  // Get user ID from params or body
  const targetUserId = req.params['userId'] || req.params['id'] || req.body?.userId;

  if (!targetUserId) {
    // No target user ID, allow (might be a general endpoint)
    next();
    return;
  }

  // Check if user is accessing their own resource
  if (req.user.userId !== targetUserId) {
    // In the future, you can add admin role check here
    // For now, only allow users to access their own resources
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'You can only access your own resources'
    });
    return;
  }

  next();
};

/**
 * Extract user ID from authenticated request
 * Helper function for route handlers
 */
export const getUserIdFromRequest = (req: Request): string | null => {
  return req.user?.userId || null;
};

/**
 * Check if request is authenticated
 * Helper function for conditional logic
 */
export const isAuthenticated = (req: Request): boolean => {
  return !!req.user;
};

