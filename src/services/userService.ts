import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';
import { withLock, getUserLockKey, getWalletLockKey } from './lockService';
import { DatabaseResponse } from '../types';

/**
 * User Service
 * 
 * Handles all user-related operations with:
 * - Optimistic locking for concurrent updates
 * - Distributed locks for race condition prevention
 * - Transaction support for atomic operations
 * - Proper error handling
 */

export interface CreateUserInput {
  privyId: string;
  email?: string;
  phone?: string;
  displayName?: string;
  profilePictureUrl?: string;
  walletAddress?: string;
}

export interface UpdateUserInput {
  email?: string;
  phone?: string;
  displayName?: string;
  profilePictureUrl?: string;
  walletAddress?: string;
  status?: string;
  lastActiveAt?: Date;
}

export interface UserWithSessions {
  id: string;
  privyId: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  profilePictureUrl: string | null;
  walletAddress: string | null;
  walletRegisteredAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date | null;
  version: number;
  sessions: Array<{
    id: string;
    deviceId: string;
    platform: string;
    isActive: boolean;
  }>;
}

/**
 * Get user by ID
 */
export const getUserById = async (
  userId: string
): Promise<DatabaseResponse<UserWithSessions>> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: {
          select: {
            id: true,
            deviceId: true,
            platform: true,
            isActive: true
          },
          where: {
            isActive: true
          }
        }
      }
    });

    if (!user) {
      return {
        data: null,
        error: 'User not found',
        success: false
      };
    }

    return {
      data: user as UserWithSessions,
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
 * Get user by Privy ID
 */
export const getUserByPrivyId = async (
  privyId: string
): Promise<DatabaseResponse<UserWithSessions>> => {
  try {
    const user = await prisma.user.findUnique({
      where: { privyId },
      include: {
        sessions: {
          select: {
            id: true,
            deviceId: true,
            platform: true,
            isActive: true
          },
          where: {
            isActive: true
          }
        }
      }
    });

    if (!user) {
      return {
        data: null,
        error: 'User not found',
        success: false
      };
    }

    return {
      data: user as UserWithSessions,
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
 * Get user by wallet address
 */
export const getUserByWalletAddress = async (
  walletAddress: string
): Promise<DatabaseResponse<UserWithSessions>> => {
  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        sessions: {
          select: {
            id: true,
            deviceId: true,
            platform: true,
            isActive: true
          },
          where: {
            isActive: true
          }
        }
      }
    });

    if (!user) {
      return {
        data: null,
        error: 'User not found',
        success: false
      };
    }

    return {
      data: user as UserWithSessions,
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
 * Create a new user with race condition protection
 */
export const createUser = async (
  input: CreateUserInput
): Promise<DatabaseResponse<UserWithSessions>> => {
  try {
    // Use distributed lock to prevent duplicate user creation
    const lockKey = getUserLockKey(input.privyId);

    return await withLock(lockKey, async () => {
      // Double-check user doesn't exist
      const existingUser = await prisma.user.findUnique({
        where: { privyId: input.privyId }
      });

      if (existingUser) {
        return {
          data: null,
          error: 'User with this Privy ID already exists',
          success: false
        };
      }

      // If wallet address provided, check it's not already registered
      if (input.walletAddress) {
        const existingWallet = await prisma.user.findUnique({
          where: { walletAddress: input.walletAddress }
        });

        if (existingWallet) {
          return {
            data: null,
            error: 'Wallet address already registered',
            success: false
          };
        }
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          privyId: input.privyId,
          email: input.email || null,
          phone: input.phone || null,
          displayName: input.displayName || null,
          profilePictureUrl: input.profilePictureUrl || null,
          walletAddress: input.walletAddress || null,
          walletRegisteredAt: input.walletAddress ? new Date() : null,
          status: 'active',
          version: 0
        },
        include: {
          sessions: {
            select: {
              id: true,
              deviceId: true,
              platform: true,
              isActive: true
            }
          }
        }
      });

      return {
        data: user as UserWithSessions,
        error: null,
        success: true
      };
    }, { timeout: 5000, retries: 3 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      const target = error.meta?.target;
      if (target?.includes('privy_id')) {
        return {
          data: null,
          error: 'User with this Privy ID already exists',
          success: false
        };
      }
      if (target?.includes('wallet_address')) {
        return {
          data: null,
          error: 'Wallet address already registered',
          success: false
        };
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Update user with optimistic locking
 */
export const updateUser = async (
  userId: string,
  input: UpdateUserInput,
  currentVersion?: number
): Promise<DatabaseResponse<UserWithSessions>> => {
  try {
    const lockKey = getUserLockKey(userId);

    return await withLock(lockKey, async () => {
      return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Get current user
        const currentUser = await tx.user.findUnique({
          where: { id: userId }
        });

        if (!currentUser) {
          return {
            data: null,
            error: 'User not found',
            success: false
          };
        }

        // Check version for optimistic locking
        if (currentVersion !== undefined && currentUser.version !== currentVersion) {
          return {
            data: null,
            error: 'User has been modified by another request. Please retry.',
            success: false
          };
        }

        // If updating wallet address, check it's not already registered
        if (input.walletAddress && input.walletAddress !== currentUser.walletAddress) {
          const existingWallet = await tx.user.findUnique({
            where: { walletAddress: input.walletAddress }
          });

          if (existingWallet && existingWallet.id !== userId) {
            return {
              data: null,
              error: 'Wallet address already registered',
              success: false
            };
          }
        }

        // Update user with incremented version
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            ...input,
            walletRegisteredAt: input.walletAddress && !currentUser.walletAddress
              ? new Date()
              : currentUser.walletRegisteredAt,
            version: currentUser.version + 1,
            updatedAt: new Date()
          },
          include: {
            sessions: {
              select: {
                id: true,
                deviceId: true,
                platform: true,
                isActive: true
              },
              where: {
                isActive: true
              }
            }
          }
        });

        return {
          data: updatedUser as UserWithSessions,
          error: null,
          success: true
        };
      });
    }, { timeout: 5000, retries: 2 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (target?.includes('wallet_address')) {
        return {
          data: null,
          error: 'Wallet address already registered',
          success: false
        };
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Register wallet for user
 */
export const registerWallet = async (
  userId: string,
  walletAddress: string
): Promise<DatabaseResponse<UserWithSessions>> => {
  try {
    const walletLockKey = getWalletLockKey(walletAddress);

    return await withLock(walletLockKey, async () => {
      // Check if wallet is already registered
      const existingWallet = await prisma.user.findUnique({
        where: { walletAddress }
      });

      if (existingWallet) {
        return {
          data: null,
          error: 'Wallet address already registered',
          success: false
        };
      }

      // Update user with wallet
      return await updateUser(userId, {
        walletAddress
      });
    }, { timeout: 5000, retries: 3 });
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Update user last active timestamp
 */
export const updateLastActive = async (
  userId: string
): Promise<DatabaseResponse<boolean>> => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastActiveAt: new Date()
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
 * Get all users with pagination
 */
export const getAllUsers = async (
  page: number = 1,
  limit: number = 50
): Promise<DatabaseResponse<{ users: UserWithSessions[]; total: number; page: number; totalPages: number }>> => {
  try {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          sessions: {
            select: {
              id: true,
              deviceId: true,
              platform: true,
              isActive: true
            },
            where: {
              isActive: true
            }
          }
        }
      }),
      prisma.user.count()
    ]);

    return {
      data: {
        users: users as UserWithSessions[],
        total,
        page,
        totalPages: Math.ceil(total / limit)
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

/**
 * Delete user (soft delete by setting status to 'deleted')
 */
export const deleteUser = async (
  userId: string
): Promise<DatabaseResponse<boolean>> => {
  try {
    const lockKey = getUserLockKey(userId);

    return await withLock(lockKey, async () => {
      // Soft delete by updating status
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'deleted',
          updatedAt: new Date()
        }
      });

      // Terminate all active sessions
      await prisma.session.updateMany({
        where: {
          userId,
          isActive: true
        },
        data: {
          isActive: false,
          terminatedAt: new Date(),
          terminationReason: 'user_deleted'
        }
      });

      return {
        data: true,
        error: null,
        success: true
      };
    }, { timeout: 5000 });
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

