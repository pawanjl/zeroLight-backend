import { prisma } from '../config/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * Distributed Lock Service
 * 
 * Prevents race conditions by implementing distributed locking mechanism
 * Ensures only one operation can hold a lock at a time
 * 
 * Features:
 * - Automatic lock expiration to prevent deadlocks
 * - Lock renewal for long-running operations
 * - Guaranteed atomic lock acquisition
 */

export interface LockOptions {
  /** Lock timeout in milliseconds (default: 30000ms = 30s) */
  timeout?: number;
  /** Number of retry attempts (default: 5) */
  retries?: number;
  /** Delay between retries in milliseconds (default: 200ms) */
  retryDelay?: number;
}

export interface Lock {
  lockKey: string;
  lockOwner: string;
  expiresAt: Date;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 10;
const DEFAULT_RETRY_DELAY = 300; // 300ms

/**
 * Acquire a distributed lock
 * 
 * @param lockKey - Unique identifier for the lock
 * @param options - Lock configuration options
 * @returns Lock owner ID if successful, null otherwise
 */
export const acquireLock = async (
  lockKey: string,
  options: LockOptions = {}
): Promise<string | null> => {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY
  } = options;

  const lockOwner = uuidv4();
  const expiresAt = new Date(Date.now() + timeout);
  const startTime = Date.now();

  console.log(`🔒 [Lock] Attempting to acquire lock: ${lockKey} | Owner: ${lockOwner.substring(0, 8)} | Timeout: ${timeout}ms | Max Retries: ${retries}`);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Try to create a new lock
      const lock = await prisma.distributedLock.create({
        data: {
          lockKey,
          lockOwner,
          expiresAt
        }
      });

      const acquireTime = Date.now() - startTime;
      console.log(`✅ [Lock] Acquired lock: ${lockKey} | Owner: ${lockOwner.substring(0, 8)} | Attempt: ${attempt + 1}/${retries + 1} | Time: ${acquireTime}ms`);
      return lock.lockOwner;
    } catch (error: any) {
      // If lock already exists, check if it's expired
      if (error.code === 'P2002') { // Unique constraint violation
        try {
          // Try to clean up expired lock and retry
          const now = new Date();
          const deleted = await prisma.distributedLock.deleteMany({
            where: {
              lockKey,
              expiresAt: {
                lt: now
              }
            }
          });

          if (deleted.count > 0) {
            // Retry immediately if we cleaned up an expired lock
            continue;
          }
        } catch (cleanupError) {
          console.error('Error cleaning up expired lock:', cleanupError);
        }

        // Lock is still valid, wait and retry
        if (attempt < retries) {
          await sleep(retryDelay * (attempt + 1)); // Exponential backoff
          continue;
        }
      }

      console.error(`Error acquiring lock for ${lockKey}:`, error);
      return null;
    }
  }

  return null;
};

/**
 * Release a distributed lock
 * 
 * @param lockKey - Lock identifier
 * @param lockOwner - Lock owner ID
 * @returns true if successfully released, false otherwise
 */
export const releaseLock = async (
  lockKey: string,
  lockOwner: string
): Promise<boolean> => {
  try {
    const result = await prisma.distributedLock.deleteMany({
      where: {
        lockKey,
        lockOwner
      }
    });

    return result.count > 0;
  } catch (error) {
    console.error(`Error releasing lock for ${lockKey}:`, error);
    return false;
  }
};

/**
 * Renew a lock to extend its expiration time
 * 
 * @param lockKey - Lock identifier
 * @param lockOwner - Lock owner ID
 * @param additionalTime - Additional time in milliseconds
 * @returns true if successfully renewed, false otherwise
 */
export const renewLock = async (
  lockKey: string,
  lockOwner: string,
  additionalTime: number = DEFAULT_TIMEOUT
): Promise<boolean> => {
  try {
    const newExpiresAt = new Date(Date.now() + additionalTime);

    const result = await prisma.distributedLock.updateMany({
      where: {
        lockKey,
        lockOwner
      },
      data: {
        expiresAt: newExpiresAt
      }
    });

    return result.count > 0;
  } catch (error) {
    console.error(`Error renewing lock for ${lockKey}:`, error);
    return false;
  }
};

/**
 * Check if a lock is currently held
 * 
 * @param lockKey - Lock identifier
 * @returns true if lock exists and is not expired, false otherwise
 */
export const isLockHeld = async (lockKey: string): Promise<boolean> => {
  try {
    const lock = await prisma.distributedLock.findUnique({
      where: {
        lockKey
      }
    });

    if (!lock) {
      return false;
    }

    // Check if lock is expired
    if (lock.expiresAt < new Date()) {
      // Clean up expired lock
      await prisma.distributedLock.delete({
        where: {
          lockKey
        }
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error checking lock status for ${lockKey}:`, error);
    return false;
  }
};

/**
 * Execute a function with a distributed lock
 * Automatically acquires and releases the lock
 * 
 * @param lockKey - Lock identifier
 * @param fn - Function to execute with lock held
 * @param options - Lock configuration options
 * @returns Result of the function execution
 */
export const withLock = async <T>(
  lockKey: string,
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<T> => {
  const lockOwner = await acquireLock(lockKey, options);

  if (!lockOwner) {
    throw new Error(`Failed to acquire lock: ${lockKey}`);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(lockKey, lockOwner);
  }
};

/**
 * Force release a lock (use with caution)
 * 
 * @param lockKey - Lock identifier
 * @returns true if successfully released, false otherwise
 */
export const forceReleaseLock = async (lockKey: string): Promise<boolean> => {
  try {
    const result = await prisma.distributedLock.delete({
      where: {
        lockKey
      }
    });

    return !!result;
  } catch (error) {
    console.error(`Error force releasing lock for ${lockKey}:`, error);
    return false;
  }
};

/**
 * Sleep helper function
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate lock key for user operations
 */
export const getUserLockKey = (userId: string): string => {
  return `user:${userId}`;
};

/**
 * Generate lock key for session operations
 */
export const getSessionLockKey = (userId: string, deviceId: string): string => {
  return `session:${userId}:${deviceId}`;
};

/**
 * Generate lock key for wallet registration
 */
export const getWalletLockKey = (walletAddress: string): string => {
  return `wallet:${walletAddress}`;
};

