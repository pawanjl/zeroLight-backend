import { prisma } from '../config/prisma';
import { DatabaseResponse } from '../types';

/**
 * Notification Preferences Service
 * 
 * Manages user notification preferences
 */

export interface NotificationPreferencesResponse {
  id: string;
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  transactionNotifications: boolean;
  securityAlerts: boolean;
  marketingUpdates: boolean;
  productUpdates: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: Date | null;
  quietHoursEnd: Date | null;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateNotificationPreferencesInput {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  transactionNotifications?: boolean;
  securityAlerts?: boolean;
  marketingUpdates?: boolean;
  productUpdates?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

/**
 * Get notification preferences for user
 */
export const getNotificationPreferences = async (
  userId: string
): Promise<DatabaseResponse<NotificationPreferencesResponse>> => {
  try {
    let preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    // If preferences don't exist, create default preferences
    if (!preferences) {
      preferences = await prisma.notificationPreferences.create({
        data: {
          userId
        }
      });
    }

    return {
      data: preferences as NotificationPreferencesResponse,
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
 * Update notification preferences
 */
export const updateNotificationPreferences = async (
  userId: string,
  input: UpdateNotificationPreferencesInput
): Promise<DatabaseResponse<NotificationPreferencesResponse>> => {
  try {
    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: {
        ...input,
        updatedAt: new Date()
      },
      create: {
        userId,
        ...input
      }
    });

    return {
      data: preferences as NotificationPreferencesResponse,
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
 * Reset notification preferences to defaults
 */
export const resetNotificationPreferences = async (
  userId: string
): Promise<DatabaseResponse<NotificationPreferencesResponse>> => {
  try {
    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: {
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        transactionNotifications: true,
        securityAlerts: true,
        marketingUpdates: false,
        productUpdates: true,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: 'UTC',
        updatedAt: new Date()
      },
      create: {
        userId
      }
    });

    return {
      data: preferences as NotificationPreferencesResponse,
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
 * Check if user should receive notification based on quiet hours
 */
export const shouldSendNotification = async (
  userId: string
): Promise<boolean> => {
  try {
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    if (!preferences || !preferences.pushEnabled) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHoursEnabled && preferences.quietHoursStart && preferences.quietHoursEnd) {
      const now = new Date();
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: preferences.timezone }));

      const currentHour = userTime.getHours();
      const currentMinute = userTime.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      const startTime = preferences.quietHoursStart.getHours() * 60 + preferences.quietHoursStart.getMinutes();
      const endTime = preferences.quietHoursEnd.getHours() * 60 + preferences.quietHoursEnd.getMinutes();

      // Check if current time is within quiet hours
      if (startTime <= endTime) {
        // Same day quiet hours (e.g., 10 PM to 6 AM next day)
        if (currentTime >= startTime && currentTime < endTime) {
          return false;
        }
      } else {
        // Overnight quiet hours (e.g., 10 PM to 6 AM)
        if (currentTime >= startTime || currentTime < endTime) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    return true; // Default to allowing notifications on error
  }
};

/**
 * Check if specific notification type is enabled
 */
export const isNotificationTypeEnabled = async (
  userId: string,
  notificationType: keyof Omit<NotificationPreferencesResponse, 'userId' | 'pushEnabled' | 'quietHoursEnabled' | 'quietHoursStart' | 'quietHoursEnd' | 'quietHoursTimezone' | 'createdAt' | 'updatedAt'>
): Promise<boolean> => {
  try {
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    if (!preferences || !preferences.pushEnabled) {
      return false;
    }

    return preferences[notificationType] as boolean;
  } catch (error) {
    console.error('Error checking notification type:', error);
    return true; // Default to allowing notifications on error
  }
};

