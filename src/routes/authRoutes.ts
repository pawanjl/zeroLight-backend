import { Router, Request, Response } from 'express';
import { loginWithPrivy, refreshAccessToken, logout, getCurrentUser } from '../services/authService';
import { verifyRefreshToken } from '../services/tokenService';
import { authenticate } from '../middleware/auth';
import { LoginRequest, RefreshTokenRequest } from '../types/auth';

/**
 * Authentication Routes
 * 
 * Handles user authentication, token refresh, and logout.
 * 
 * Routes:
 * - POST /login - Login with Privy token
 * - POST /refresh - Refresh access token
 * - POST /logout - Logout and terminate session
 * - GET /me - Get current authenticated user
 */

const router: Router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login with Privy access token
 * @access  Public
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { privyToken, deviceId, deviceName, platform, pushToken } = req.body;

    // Validate required fields
    if (!privyToken || typeof privyToken !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'privyToken is required and must be a string'
      });
      return;
    }

    const loginRequest: LoginRequest = {
      privyToken,
      deviceId: deviceId || undefined,
      deviceName: deviceName || undefined,
      platform: platform || 'web',
      pushToken: pushToken || undefined
    };

    // Perform login
    const result = await loginWithPrivy(loginRequest);

    if (!result.success) {
      res.status(401).json({
        success: false,
        error: result.error || 'Authentication failed',
        message: result.message || 'Invalid Privy token'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: result.message || 'Login successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Login failed'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body as RefreshTokenRequest;

    if (!refreshToken || typeof refreshToken !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'refreshToken is required and must be a string'
      });
      return;
    }

    // Verify refresh token
    const verificationResult = verifyRefreshToken(refreshToken);

    if (!verificationResult.success || !verificationResult.payload) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: verificationResult.error || 'Invalid or expired refresh token'
      });
      return;
    }

    const { userId, privyId } = verificationResult.payload;

    // Generate new tokens
    const result = await refreshAccessToken(userId, privyId);

    if (!result.success || !result.tokens) {
      res.status(401).json({
        success: false,
        error: result.error || 'Token refresh failed',
        message: 'Failed to refresh access token'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        tokens: result.tokens
      },
      message: 'Token refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Refresh token route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Token refresh failed'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and terminate session
 * @access  Protected
 */
router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    const { sessionId } = req.body;

    const result = await logout(req.user.userId, sessionId);

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error || 'Logout failed',
        message: 'Failed to logout'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logout route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Logout failed'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user details
 * @access  Protected
 */
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    const result = await getCurrentUser(req.user.userId);

    if (!result.success || !result.data) {
      res.status(404).json({
        success: false,
        error: result.error || 'User not found',
        message: 'Failed to get user details'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get current user route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to get user details'
    });
  }
});

/**
 * @route   GET /api/auth/status
 * @desc    Check authentication status (health check for auth)
 * @access  Public
 */
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Authentication service is operational',
    timestamp: new Date().toISOString()
  });
});

export default router;

