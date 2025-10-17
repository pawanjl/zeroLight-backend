import { Router, Request, Response } from 'express';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  resetNotificationPreferences
} from '../../services/notificationService';
import { logActivity, ActivityActions } from '../../services/activityLogService';

const router: Router = Router();

/**
 * @route   GET /api/v1/notifications/user/:userId
 * @desc    Get notification preferences for user
 * @access  Public
 */
router.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params['userId'];

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'User ID is required'
      });
      return;
    }

    const result = await getNotificationPreferences(userId);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to fetch preferences',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   PUT /api/v1/notifications/user/:userId
 * @desc    Update notification preferences for user
 * @access  Public
 */
router.put('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params['userId'];

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'User ID is required'
      });
      return;
    }

    const {
      pushEnabled,
      emailEnabled,
      smsEnabled,
      transactionNotifications,
      securityAlerts,
      marketingUpdates,
      productUpdates,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      timezone
    } = req.body;

    // Validate quiet hours if enabled
    if (quietHoursEnabled && (!quietHoursStart || !quietHoursEnd)) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Quiet hours start and end times are required when quiet hours are enabled'
      });
      return;
    }

    const updateData: any = {};
    if (pushEnabled !== undefined) updateData.pushEnabled = pushEnabled;
    if (emailEnabled !== undefined) updateData.emailEnabled = emailEnabled;
    if (smsEnabled !== undefined) updateData.smsEnabled = smsEnabled;
    if (transactionNotifications !== undefined) updateData.transactionNotifications = transactionNotifications;
    if (securityAlerts !== undefined) updateData.securityAlerts = securityAlerts;
    if (marketingUpdates !== undefined) updateData.marketingUpdates = marketingUpdates;
    if (productUpdates !== undefined) updateData.productUpdates = productUpdates;
    if (quietHoursEnabled !== undefined) updateData.quietHoursEnabled = quietHoursEnabled;
    if (quietHoursStart) updateData.quietHoursStart = new Date(`1970-01-01T${quietHoursStart}`);
    if (quietHoursEnd) updateData.quietHoursEnd = new Date(`1970-01-01T${quietHoursEnd}`);
    if (timezone) updateData.timezone = timezone;

    const result = await updateNotificationPreferences(userId, updateData);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to update preferences',
        message: result.error
      });
      return;
    }

    // Log activity
    if (req.ip) {
      await logActivity({
        userId,
        action: 'notification_preferences_updated',
        metadata: {
          updatedFields: Object.keys(updateData)
        },
        ipAddress: req.ip
      });
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Notification preferences updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/v1/notifications/preferences/:userId (Legacy support)
 * @desc    Get notification preferences for user
 * @access  Public
 */
router.get('/preferences/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'User ID is required'
      });
      return;
    }

    const result = await getNotificationPreferences(userId);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to fetch notification preferences',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   PUT /api/v1/notifications/preferences/:userId
 * @desc    Update notification preferences
 * @access  Public
 */
router.put('/preferences/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'User ID is required'
      });
      return;
    }

    const {
      tradeExecutedEnabled,
      orderFilledEnabled,
      orderCancelledEnabled,
      positionLiquidatedEnabled,
      fundingPaymentEnabled,
      priceAlertEnabled,
      marginWarningEnabled,
      pushEnabled,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      quietHoursTimezone
    } = req.body;

    // Validate quiet hours if enabled
    if (quietHoursEnabled && (!quietHoursStart || !quietHoursEnd)) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Quiet hours start and end times are required when quiet hours are enabled'
      });
      return;
    }

    const updateData: any = {
      tradeExecutedEnabled,
      orderFilledEnabled,
      orderCancelledEnabled,
      positionLiquidatedEnabled,
      fundingPaymentEnabled,
      priceAlertEnabled,
      marginWarningEnabled,
      pushEnabled,
      quietHoursEnabled,
      quietHoursTimezone
    };

    if (quietHoursStart !== undefined) {
      updateData.quietHoursStart = new Date(quietHoursStart);
    }
    if (quietHoursEnd !== undefined) {
      updateData.quietHoursEnd = new Date(quietHoursEnd);
    }

    const result = await updateNotificationPreferences(userId, updateData);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Failed to update notification preferences',
        message: result.error
      });
      return;
    }

    // Log activity
    if (req.ip) {
      await logActivity({
        userId,
        action: ActivityActions.SETTINGS_UPDATED,
        metadata: {
          settingType: 'notification_preferences',
          updatedFields: Object.keys(req.body)
        },
        ipAddress: req.ip
      });
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Notification preferences updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   POST /api/v1/notifications/preferences/:userId/reset
 * @desc    Reset notification preferences to defaults
 * @access  Public
 */
router.post('/preferences/:userId/reset', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'User ID is required'
      });
      return;
    }

    const result = await resetNotificationPreferences(userId);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Failed to reset notification preferences',
        message: result.error
      });
      return;
    }

    // Log activity
    if (req.ip) {
      await logActivity({
        userId,
        action: ActivityActions.SETTINGS_UPDATED,
        metadata: {
          settingType: 'notification_preferences',
          action: 'reset_to_defaults'
        },
        ipAddress: req.ip
      });
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Notification preferences reset to defaults',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

