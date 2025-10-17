import { prisma } from '../config/prisma';
import { DatabaseResponse } from '../types';

/**
 * Activity Log Service
 * 
 * Handles activity logging with support for:
 * - Partitioned tables (partitioning handled at DB level)
 * - High-volume concurrent writes
 * - Flexible metadata storage
 */

export interface CreateActivityLogInput {
  userId: string;
  sessionId?: string | null;
  action: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
}

export interface ActivityLogResponse {
  id: string;
  userId: string;
  sessionId: string | null;
  action: string;
  metadata: any;
  ipAddress: string | null;
  createdAt: Date;
}

export interface ActivityLogFilters {
  userId?: string;
  sessionId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Create activity log entry
 */
export const createActivityLog = async (
  input: CreateActivityLogInput
): Promise<DatabaseResponse<ActivityLogResponse>> => {
  try {
    const data: any = {
      userId: input.userId,
      sessionId: input.sessionId || null,
      action: input.action,
      ipAddress: input.ipAddress || null
    };

    if (input.metadata) {
      data.metadata = input.metadata;
    }

    const log = await prisma.activityLog.create({ data });

    return {
      data: log as ActivityLogResponse,
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
 * Create activity log entry (async, fire-and-forget)
 * Use this for high-volume logging where you don't need to wait for confirmation
 */
export const logActivity = async (
  input: CreateActivityLogInput
): Promise<void> => {
  try {
    const data: any = {
      userId: input.userId,
      sessionId: input.sessionId || null,
      action: input.action,
      ipAddress: input.ipAddress || null
    };

    if (input.metadata) {
      data.metadata = input.metadata;
    }

    await prisma.activityLog.create({ data });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error - logging should not break application flow
  }
};

/**
 * Get activity logs with filters and pagination
 */
export const getActivityLogs = async (
  filters: ActivityLogFilters,
  page: number = 1,
  limit: number = 50
): Promise<DatabaseResponse<{
  logs: ActivityLogResponse[];
  total: number;
  page: number;
  totalPages: number;
}>> => {
  try {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.sessionId) {
      where.sessionId = filters.sessionId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.activityLog.count({ where })
    ]);

    return {
      data: {
        logs: logs as ActivityLogResponse[],
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
 * Get recent activity logs for user
 */
export const getUserRecentActivity = async (
  userId: string,
  limit: number = 20
): Promise<DatabaseResponse<ActivityLogResponse[]>> => {
  try {
    const logs = await prisma.activityLog.findMany({
      where: { userId },
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      data: logs as ActivityLogResponse[],
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
 * Get activity log statistics
 */
export const getActivityStats = async (
  userId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<DatabaseResponse<{
  totalActions: number;
  actionBreakdown: { action: string; count: number }[];
}>> => {
  try {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [total, breakdown] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: {
          _count: {
            action: 'desc'
          }
        }
      })
    ]);

    return {
      data: {
        totalActions: total,
        actionBreakdown: breakdown.map((item: any) => ({
          action: item.action,
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

/**
 * Delete old activity logs (cleanup)
 * Typically called by a scheduled job
 */
export const deleteOldActivityLogs = async (
  olderThanDays: number
): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  } catch (error) {
    console.error('Error deleting old activity logs:', error);
    return 0;
  }
};

/**
 * Common activity actions (constants)
 */
export const ActivityActions = {
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  SESSION_CREATED: 'session_created',
  SESSION_TERMINATED: 'session_terminated',
  WALLET_CONNECTED: 'wallet_connected',
  WALLET_DISCONNECTED: 'wallet_disconnected',
  TRADE_EXECUTED: 'trade_executed',
  ORDER_PLACED: 'order_placed',
  ORDER_CANCELLED: 'order_cancelled',
  NOTIFICATION_SENT: 'notification_sent',
  SETTINGS_UPDATED: 'settings_updated',
  PROFILE_UPDATED: 'profile_updated',
  PASSWORD_CHANGED: 'password_changed',
  TWO_FA_ENABLED: 'two_fa_enabled',
  TWO_FA_DISABLED: 'two_fa_disabled',
} as const;

