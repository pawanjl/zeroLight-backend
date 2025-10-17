import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';
import { withLock, getSessionLockKey } from './lockService';
import { DatabaseResponse } from '../types';

/**
 * Session Service
 * 
 * Handles session management with:
 * - Idempotency support to prevent duplicate sessions
 * - Automatic session expiration
 * - Concurrent session management
 * - Race condition prevention
 */

export interface CreateSessionInput {
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

export interface UpdateSessionInput {
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string;
  ipAddress?: string;
}

export interface SessionResponse {
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
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  terminatedAt: Date | null;
  terminationReason: string | null;
}

const DEFAULT_SESSION_EXPIRY_DAYS = 30;

/**
 * Get existing session or create new one (RECOMMENDED)
 * 
 * Uses userId + deviceId as natural idempotency key. ONE session record per device forever.
 * 
 * Behavior:
 * - If ANY session exists for userId+deviceId (active OR terminated): REACTIVATES it
 * - If no session exists: Creates new session (first time this device has logged in)
 * - When reactivating: Updates metadata, resets expiration, clears termination info
 * - Terminates sessions on other devices (single active session per user policy)
 * 
 * This means:
 * - Login/logout 1000 times = Same session record, just toggling is_active
 * - Session history is preserved in created_at, last_activity_at, terminated_at
 * 
 * @param input - Session creation parameters (idempotencyKey is optional)
 * @returns Existing (reactivated) or newly created session
 */
export const getOrCreateSession = async (
  input: CreateSessionInput
): Promise<DatabaseResponse<SessionResponse>> => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`\n🚀 [Session-${requestId}] getOrCreateSession START`);
  console.log(`   📝 UserId: ${input.userId}`);
  console.log(`   📱 DeviceId: ${input.deviceId}`);
  console.log(`   🏷️  Platform: ${input.platform}`);
  console.log(`   📍 IP: ${input.ipAddress || 'N/A'}`);

  try {
    const lockKey = getSessionLockKey(input.userId, input.deviceId);
    console.log(`   🔑 Lock Key: ${lockKey}`);

    return await withLock(lockKey, async () => {
      console.log(`   ✅ [Session-${requestId}] Lock acquired, entering transaction`);

      return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        console.log(`   🔍 [Session-${requestId}] Checking for existing active session...`);

        // DEBUG: Check ALL active sessions for this user
        const allActiveSessions = await tx.session.findMany({
          where: {
            userId: input.userId,
            isActive: true
          },
          select: {
            id: true,
            deviceId: true,
            createdAt: true,
            platform: true
          }
        });
        console.log(`   📊 [Session-${requestId}] Found ${allActiveSessions.length} active sessions for user:`);
        allActiveSessions.forEach((s: { id: string; deviceId: string; platform: string; createdAt: Date }) => {
          console.log(`      - ${s.id.substring(0, 8)} | Device: ${s.deviceId} | Platform: ${s.platform} | Created: ${s.createdAt.toISOString()}`);
        });

        // Check for ANY session (active OR terminated) for this user + device combination
        // We want to REUSE the same session record, not create new ones
        const existingSession = await tx.session.findFirst({
          where: {
            userId: input.userId,
            deviceId: input.deviceId
          },
          orderBy: {
            createdAt: 'desc' // Get most recent if multiple exist
          }
        });

        if (existingSession) {
          console.log(`   ♻️  [Session-${requestId}] Found existing session: ${existingSession.id}`);
          console.log(`   📅 Created: ${existingSession.createdAt.toISOString()}`);
          console.log(`   📊 Active: ${existingSession.isActive} | Terminated: ${existingSession.terminatedAt ? 'Yes' : 'No'}`);

          // Calculate new expiration date
          const expiresInDays = input.expiresInDays || DEFAULT_SESSION_EXPIRY_DAYS;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + expiresInDays);

          // Reactivate or update the existing session
          const updatedSession = await tx.session.update({
            where: { id: existingSession.id },
            data: {
              // Reactivate the session
              isActive: true,
              terminatedAt: null,
              terminationReason: null,
              lastActivityAt: new Date(),
              expiresAt: expiresAt,
              // Update device metadata if provided
              ...(input.deviceName && { deviceName: input.deviceName }),
              ...(input.deviceModel && { deviceModel: input.deviceModel }),
              ...(input.osVersion && { osVersion: input.osVersion }),
              ...(input.appVersion && { appVersion: input.appVersion }),
              ...(input.pushToken && {
                pushToken: input.pushToken,
                pushTokenUpdatedAt: new Date()
              }),
              ...(input.ipAddress && { ipAddress: input.ipAddress })
            }
          });

          // Terminate sessions on OTHER devices (single active session policy)
          console.log(`   🧹 [Session-${requestId}] Terminating sessions for other devices...`);
          const otherDevicesResult = await tx.session.updateMany({
            where: {
              userId: input.userId,
              isActive: true,
              NOT: {
                id: existingSession.id // Don't terminate the one we just reactivated
              }
            },
            data: {
              isActive: false,
              terminatedAt: new Date(),
              terminationReason: 'new_session_on_different_device'
            }
          });
          console.log(`   📊 [Session-${requestId}] Terminated ${otherDevicesResult.count} sessions for other devices`);

          console.log(`   ✅ [Session-${requestId}] Session reactivated and updated`);

          return {
            data: updatedSession as SessionResponse,
            error: null,
            success: true
          };
        }

        // No session exists at all, create a new one (first time for this device)
        console.log(`   🆕 [Session-${requestId}] No existing session found, creating new one (first time device)`);

        // Terminate other active sessions for this user (single session per user policy)
        console.log(`   🧹 [Session-${requestId}] Terminating sessions for other devices...`);
        const otherDevicesResult = await tx.session.updateMany({
          where: {
            userId: input.userId,
            isActive: true
          },
          data: {
            isActive: false,
            terminatedAt: new Date(),
            terminationReason: 'new_session_on_different_device'
          }
        });
        console.log(`   📊 [Session-${requestId}] Terminated ${otherDevicesResult.count} sessions for other devices`);

        // Calculate expiration date
        const expiresInDays = input.expiresInDays || DEFAULT_SESSION_EXPIRY_DAYS;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        // Use client-provided idempotency key if available (for request deduplication)
        // Otherwise null - we rely on userId+deviceId uniqueness check above
        console.log(`   🔑 [Session-${requestId}] Idempotency key: ${input.idempotencyKey || 'none'}`);

        // Create new session
        console.log(`   💾 [Session-${requestId}] Creating session in database...`);
        const newSession = await tx.session.create({
          data: {
            userId: input.userId,
            deviceId: input.deviceId,
            deviceName: input.deviceName || null,
            deviceModel: input.deviceModel || null,
            platform: input.platform,
            osVersion: input.osVersion || null,
            appVersion: input.appVersion || null,
            pushToken: input.pushToken || null,
            pushTokenUpdatedAt: input.pushToken ? new Date() : null,
            ipAddress: input.ipAddress || null,
            idempotencyKey: input.idempotencyKey || null, // Optional client idempotency key
            isActive: true,
            expiresAt
          }
        });
        console.log(`   ✅ [Session-${requestId}] Session created successfully: ${newSession.id}`);

        return {
          data: newSession as SessionResponse,
          error: null,
          success: true
        };
      });
    }, { timeout: 5000, retries: 3 });
  } catch (error: any) {
    console.error(`❌ [Session-${requestId}] Error in getOrCreateSession:`, error);
    console.error(`   User: ${input.userId}, Device: ${input.deviceId}`);

    // Check if it's a unique constraint violation on idempotencyKey
    if (error.code === 'P2002' && error.meta?.target?.includes('idempotency_key')) {
      console.error(`   🔴 Duplicate idempotency key detected - race condition occurred!`);
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  } finally {
    console.log(`🏁 [Session-${requestId}] getOrCreateSession END\n`);
  }
};

/**
 * Get session by ID
 */
export const getSessionById = async (
  sessionId: string
): Promise<DatabaseResponse<SessionResponse>> => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return {
        data: null,
        error: 'Session not found',
        success: false
      };
    }

    return {
      data: session as SessionResponse,
      error: null,
      success: true
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Get active session for user
 */
export const getActiveSession = async (
  userId: string
): Promise<DatabaseResponse<SessionResponse>> => {
  try {
    const session = await prisma.session.findFirst({
      where: {
        userId,
        isActive: true
      }
    });

    if (!session) {
      return {
        data: null,
        error: 'No active session found',
        success: false
      };
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await prisma.session.update({
        where: { id: session.id },
        data: {
          isActive: false,
          terminatedAt: new Date(),
          terminationReason: 'expired'
        }
      });

      return {
        data: null,
        error: 'Session expired',
        success: false
      };
    }

    return {
      data: session as SessionResponse,
      error: null,
      success: true
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Get all sessions for user
 */
export const getUserSessions = async (
  userId: string,
  includeInactive: boolean = false
): Promise<DatabaseResponse<SessionResponse[]>> => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        ...(includeInactive ? {} : { isActive: true })
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      data: sessions as SessionResponse[],
      error: null,
      success: true
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Update session
 */
export const updateSession = async (
  sessionId: string,
  input: UpdateSessionInput
): Promise<DatabaseResponse<SessionResponse>> => {
  try {
    const updateData: any = {
      ...input,
      lastActivityAt: new Date()
    };

    // Update push token timestamp if push token is being updated
    if (input.pushToken) {
      updateData.pushTokenUpdatedAt = new Date();
    }

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: updateData
    });

    return {
      data: session as SessionResponse,
      error: null,
      success: true
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Update session activity timestamp
 */
export const updateSessionActivity = async (
  sessionId: string
): Promise<DatabaseResponse<boolean>> => {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: new Date()
      }
    });

    return {
      data: true,
      error: null,
      success: true
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Update push token for session
 */
export const updatePushToken = async (
  sessionId: string,
  pushToken: string
): Promise<DatabaseResponse<SessionResponse>> => {
  try {
    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        pushToken,
        pushTokenUpdatedAt: new Date(),
        lastActivityAt: new Date()
      }
    });

    return {
      data: session as SessionResponse,
      error: null,
      success: true
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Terminate session
 */
export const terminateSession = async (
  sessionId: string,
  reason: string = 'user_logout'
): Promise<DatabaseResponse<boolean>> => {
  try {
    console.log(`🛑 [Terminate] Terminating session: ${sessionId} | Reason: ${reason}`);

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason
      }
    });

    console.log(`✅ [Terminate] Session terminated successfully: ${sessionId}`);

    return {
      data: true,
      error: null,
      success: true
    };
  } catch (error) {
    console.error(`❌ [Terminate] Failed to terminate session ${sessionId}:`, error);

    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Terminate all sessions for user
 */
export const terminateAllUserSessions = async (
  userId: string,
  reason: string = 'user_logout_all'
): Promise<DatabaseResponse<{ count: number; sessionIds: string[] }>> => {
  try {
    console.log(`🛑 [TerminateAll] Terminating all sessions for user: ${userId} | Reason: ${reason}`);

    // First, get the active session IDs before terminating
    const activeSessions = await prisma.session.findMany({
      where: {
        userId,
        isActive: true
      },
      select: {
        id: true
      }
    });

    const sessionIds = activeSessions.map((s: { id: string }) => s.id);
    console.log(`   📋 [TerminateAll] Found ${sessionIds.length} active sessions to terminate`);

    // Now terminate them
    const result = await prisma.session.updateMany({
      where: {
        userId,
        isActive: true
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason
      }
    });

    console.log(`✅ [TerminateAll] Terminated ${result.count} sessions for user: ${userId}`);

    return {
      data: { count: result.count, sessionIds },
      error: null,
      success: true
    };
  } catch (error) {
    console.error(`❌ [TerminateAll] Failed to terminate sessions for user ${userId}:`, error);

    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Extend session expiration
 */
export const extendSession = async (
  sessionId: string,
  additionalDays: number = 30
): Promise<DatabaseResponse<SessionResponse>> => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return {
        data: null,
        error: 'Session not found',
        success: false
      };
    }

    const newExpiresAt = new Date(session.expiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + additionalDays);

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        expiresAt: newExpiresAt,
        lastActivityAt: new Date()
      }
    });

    return {
      data: updatedSession as SessionResponse,
      error: null,
      success: true
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Cleanup expired sessions (called periodically)
 */
export const cleanupExpiredSessions = async (): Promise<number> => {
  try {
    const result = await prisma.session.updateMany({
      where: {
        isActive: true,
        expiresAt: {
          lt: new Date()
        }
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: 'expired'
      }
    });

    return result.count;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
};

/**
 * Get session statistics for user
 */
export const getSessionStats = async (
  userId: string
): Promise<DatabaseResponse<{
  totalSessions: number;
  activeSessions: number;
  deviceBreakdown: { platform: string; count: number }[];
}>> => {
  try {
    const [total, active, breakdown] = await Promise.all([
      prisma.session.count({
        where: { userId }
      }),
      prisma.session.count({
        where: { userId, isActive: true }
      }),
      prisma.session.groupBy({
        by: ['platform'],
        where: { userId },
        _count: true
      })
    ]);

    return {
      data: {
        totalSessions: total,
        activeSessions: active,
        deviceBreakdown: breakdown.map((item: any) => ({
          platform: item.platform,
          count: item._count
        }))
      },
      error: null,
      success: true
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

