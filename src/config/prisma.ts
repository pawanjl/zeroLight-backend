import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Configuration with Connection Pooling
 * 
 * This configuration ensures:
 * - Proper connection pooling for concurrent users
 * - Query logging in development
 * - Graceful shutdown handling
 * - Connection limits to prevent pool exhaustion
 */

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Connection pool configuration is handled via DATABASE_URL connection string parameters
// Example: postgresql://user:password@localhost:5432/db?connection_limit=100&connect_timeout=10

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development'
      ? ['query', 'error', 'warn']
      : ['error']
  });

// In development, store the client in global to prevent multiple instances
if (process.env['NODE_ENV'] !== 'production') {
  global.prisma = prisma;
}

/**
 * Gracefully disconnect from database on shutdown
 */
export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
};

/**
 * Health check for database connection
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
};

/**
 * Clean up expired distributed locks
 */
export const cleanupExpiredLocks = async (): Promise<number> => {
  const result = await prisma.distributedLock.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
  return result.count;
};

/**
 * Clean up expired sessions
 */
export const cleanupExpiredSessions = async (): Promise<number> => {
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
};

// Set up periodic cleanup tasks
if (process.env['NODE_ENV'] === 'production') {
  // Clean up expired locks every 5 minutes
  setInterval(async () => {
    try {
      const count = await cleanupExpiredLocks();
      if (count > 0) {
        console.log(`Cleaned up ${count} expired locks`);
      }
    } catch (error) {
      console.error('Error cleaning up expired locks:', error);
    }
  }, 5 * 60 * 1000);

  // Clean up expired sessions every 10 minutes
  setInterval(async () => {
    try {
      const count = await cleanupExpiredSessions();
      if (count > 0) {
        console.log(`Cleaned up ${count} expired sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }, 10 * 60 * 1000);
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await disconnectPrisma();
});

process.on('SIGINT', async () => {
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectPrisma();
  process.exit(0);
});

