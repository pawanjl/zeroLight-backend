import { verifyPrivyToken } from '../config/privy';
import { prisma } from '../config/prisma';
import { generateTokenPair } from './tokenService';
import { AuthResponse, LoginRequest, TokenResponse } from '../types/auth';
import { createUser, getUserByPrivyId } from './userService';
import { logActivity } from './activityLogService';

/**
 * Auth Service
 * 
 * Handles authentication business logic including:
 * - Privy token verification
 * - User creation/retrieval
 * - JWT token generation
 * - Session management
 */

/**
 * Login with Privy token
 * Verifies Privy token, creates/updates user, issues JWT tokens
 */
export const loginWithPrivy = async (request: LoginRequest): Promise<AuthResponse> => {
  try {
    const { privyToken, deviceId, deviceName, platform, pushToken } = request;

    // Step 1: Verify Privy token
    const privyResult = await verifyPrivyToken(privyToken);
    
    if (!privyResult.success || !privyResult.claims) {
      return {
        success: false,
        error: 'Invalid Privy token',
        message: privyResult.error || 'Token verification failed'
      };
    }

    const privyClaims = privyResult.claims;
    const privyId = privyClaims.userId;

    // Step 2: Get or create user
    let userResult = await getUserByPrivyId(privyId);
    let user;
    let isNewUser = false;

    if (!userResult.success || !userResult.data) {
      // User doesn't exist, create new user
      isNewUser = true;
      const createResult = await createUser({
        privyId,
        email: (privyClaims as any).email,
        phone: (privyClaims as any).phone,
        walletAddress: (privyClaims as any).wallet?.address
      });

      if (!createResult.success || !createResult.data) {
        return {
          success: false,
          error: 'Failed to create user',
          message: createResult.error || 'User creation failed'
        };
      }

      user = createResult.data;
    } else {
      user = userResult.data;

      // Update last active timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() }
      });
    }

    // Step 3: Create or update session if device info provided
    let sessionId: string | undefined;
    let sessionData: { id: string; deviceId: string; platform: string } | undefined;
    
    if (deviceId && platform) {
      try {
        // Check if session already exists for this device
        const existingSession = await prisma.session.findFirst({
          where: {
            userId: user.id,
            deviceId: deviceId,
            isActive: true
          }
        });

        let session;
        if (existingSession) {
          // Update existing session with new push token if provided
          session = await prisma.session.update({
            where: { id: existingSession.id },
            data: {
              lastActivityAt: new Date(),
              pushToken: pushToken || existingSession.pushToken,
              pushTokenUpdatedAt: pushToken ? new Date() : existingSession.pushTokenUpdatedAt,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Extend 7 days
              deviceName: deviceName || existingSession.deviceName
            }
          });
        } else {
          // Create new session
          session = await prisma.session.create({
            data: {
              userId: user.id,
              deviceId,
              deviceName: deviceName || 'Unknown Device',
              platform: platform || 'web',
              pushToken: pushToken || null,
              pushTokenUpdatedAt: pushToken ? new Date() : null,
              isActive: true,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
              idempotencyKey: `${user.id}-${deviceId}-${Date.now()}`
            }
          });
        }
        
        sessionId = session.id;
        sessionData = {
          id: session.id,
          deviceId: session.deviceId,
          platform: session.platform
        };
      } catch (error) {
        console.error('Failed to create/update session:', error);
        // Continue without session - not critical
      }
    }

    // Step 4: Generate JWT tokens
    const tokens: TokenResponse = generateTokenPair({
      userId: user.id,
      privyId: user.privyId,
      email: user.email ?? undefined,
      walletAddress: user.walletAddress ?? undefined
    });

    // Step 5: Log authentication activity
    try {
      await logActivity({
        userId: user.id,
        sessionId: sessionId ?? null,
        action: 'user_login',
        metadata: {
          method: 'privy',
          platform: platform || 'unknown',
          deviceId: deviceId || 'unknown'
        }
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Continue - logging failure shouldn't block login
    }

    // Step 6: Return success response
    const responseData: AuthResponse['data'] = {
      user: {
        id: user.id,
        privyId: user.privyId,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        walletAddress: user.walletAddress ?? undefined,
        displayName: user.displayName ?? undefined,
        profilePictureUrl: user.profilePictureUrl ?? undefined
      },
      tokens,
      isNewUser,
      ...(sessionData && { session: sessionData })
    };

    return {
      success: true,
      data: responseData,
      message: isNewUser ? 'Account created successfully' : 'Login successful'
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (
  _userId: string,
  privyId: string
): Promise<{ success: boolean; tokens?: TokenResponse; error?: string }> => {
  try {
    // Verify user still exists and is active
    const userResult = await getUserByPrivyId(privyId);
    
    if (!userResult.success || !userResult.data) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    const user = userResult.data;

    if (user.status !== 'active') {
      return {
        success: false,
        error: 'User account is not active'
      };
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: user.id,
      privyId: user.privyId,
      email: user.email ?? undefined,
      walletAddress: user.walletAddress ?? undefined
    });

    // Update last active timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    });

    return {
      success: true,
      tokens
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      error: 'Failed to refresh token'
    };
  }
};

/**
 * Logout user and terminate session
 */
export const logout = async (
  userId: string,
  sessionId?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // If session ID provided, terminate that specific session
    if (sessionId) {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          isActive: false,
          terminatedAt: new Date(),
          terminationReason: 'user_logout'
        }
      });
    }

    // Log logout activity
    try {
      await logActivity({
        userId,
        sessionId: sessionId ?? null,
        action: 'user_logout',
        metadata: {
          method: 'manual'
        }
      });
    } catch (error) {
      console.error('Failed to log logout activity:', error);
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: 'Logout failed'
    };
  }
};

/**
 * Get current authenticated user details
 */
export const getCurrentUser = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: {
          where: { isActive: true },
          orderBy: { lastActivityAt: 'desc' },
          take: 5
        },
        notificationPreferences: true
      }
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        privyId: user.privyId,
        email: user.email,
        phone: user.phone,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        profilePictureUrl: user.profilePictureUrl,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        lastActiveAt: user.lastActiveAt?.toISOString(),
        activeSessions: user.sessions.map(s => ({
          id: s.id,
          deviceName: s.deviceName,
          platform: s.platform,
          lastActivityAt: s.lastActivityAt.toISOString()
        })),
        notificationPreferences: user.notificationPreferences
      }
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return {
      success: false,
      error: 'Failed to get user details'
    };
  }
};

