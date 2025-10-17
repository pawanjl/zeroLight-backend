import { Router, Request, Response } from 'express';
import {
  getOrCreateSession,
  getSessionById,
  getActiveSession,
  getUserSessions,
  updateSession,
  updateSessionActivity,
  updatePushToken,
  terminateSession,
  terminateAllUserSessions,
  extendSession,
  getSessionStats
} from '../../services/sessionService';
import { logActivity, ActivityActions } from '../../services/activityLogService';

const router: Router = Router();

/**
 * @route   GET /api/v1/sessions
 * @desc    Get all sessions (paginated)
 * @access  Public
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: 'Use /api/v1/sessions/user/:userId to get sessions for a specific user',
      endpoints: {
        getUserSessions: '/api/v1/sessions/user/:userId',
        getSession: '/api/v1/sessions/:id',
        sessionStats: '/api/v1/sessions/user/:userId/stats'
      }
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
 * @route   POST /api/v1/sessions/get-or-create
 * @desc    Get existing session or create new one (RECOMMENDED - prevents duplicates)
 * @access  Public
 */
router.post('/get-or-create', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userId,
      deviceId,
      deviceName,
      deviceModel,
      platform,
      osVersion,
      appVersion,
      pushToken,
      expiresInDays
    } = req.body;

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'User ID is required and must be a string'
      });
      return;
    }

    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Device ID is required and must be a string'
      });
      return;
    }

    if (!platform || (platform !== 'ios' && platform !== 'android' && platform !== 'web')) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Platform must be either "ios", "android", or "web"'
      });
      return;
    }

    const result = await getOrCreateSession({
      userId,
      deviceId,
      deviceName: deviceName || null,
      deviceModel: deviceModel || null,
      platform,
      osVersion: osVersion || null,
      appVersion: appVersion || null,
      pushToken: pushToken || null,
      ipAddress: req.ip || null,
      expiresInDays
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Failed to get or create session',
        message: result.error
      });
      return;
    }

    // Log activity only if a new session was created (check if createdAt is recent)
    if (result.data && req.ip) {
      const isNewSession = new Date().getTime() - new Date(result.data.createdAt).getTime() < 5000;
      if (isNewSession) {
        await logActivity({
          userId,
          sessionId: result.data.id,
          action: ActivityActions.SESSION_CREATED,
          metadata: {
            deviceId,
            platform,
            deviceModel
          },
          ipAddress: req.ip
        });
      }
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Session retrieved or created successfully',
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
 * @route   GET /api/v1/sessions/:id
 * @desc    Get session by ID
 * @access  Public
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Session ID is required'
      });
      return;
    }

    const result = await getSessionById(id);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
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
 * @route   DELETE /api/v1/sessions/user/:userId/all
 * @desc    Terminate all sessions for user (MUST BE BEFORE /user/:userId route)
 * @access  Public
 */
router.delete('/user/:userId/all', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params['userId'];
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID required' });
      return;
    }
    const { reason } = req.body;

    const result = await terminateAllUserSessions(userId, reason || 'user_logout_all');

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: 'Failed to terminate sessions',
        message: result.error
      });
      return;
    }

    // Log activity for each terminated session
    if (req.ip && result.data) {
      // Log activity for each session that was terminated
      for (const sessionId of result.data.sessionIds) {
        await logActivity({
          userId,
          sessionId,
          action: ActivityActions.USER_LOGOUT,
          metadata: {
            reason: reason || 'user_logout_all',
            totalSessionsTerminated: result.data.count
          },
          ipAddress: req.ip
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `${result.data?.count || 0} session(s) terminated successfully`,
      count: result.data?.count || 0,
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
 * @route   GET /api/v1/sessions/user/:userId/active
 * @desc    Get active session for user
 * @access  Public
 */
router.get('/user/:userId/active', async (req: Request, res: Response): Promise<void> => {
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

    const result = await getActiveSession(userId);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'No active session found',
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
 * @route   GET /api/v1/sessions/user/:userId/stats
 * @desc    Get session statistics for user (MUST BE BEFORE /user/:userId route)
 * @access  Public
 */
router.get('/user/:userId/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params['userId'];
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID required' });
      return;
    }

    const result = await getSessionStats(userId);

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch session stats',
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
 * @route   GET /api/v1/sessions/user/:userId
 * @desc    Get all sessions for user (MUST BE AFTER specific /user/:userId/* routes)
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
    const includeInactive = req.query['includeInactive'] === 'true';

    const result = await getUserSessions(userId, includeInactive);

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sessions',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      count: result.data?.length || 0,
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
 * @route   PUT /api/v1/sessions/:id
 * @desc    Update session
 * @access  Public
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ success: false, error: 'Session ID required' });
      return;
    }
    const { deviceName, deviceModel, osVersion, appVersion, pushToken } = req.body;

    const result = await updateSession(id, {
      deviceName,
      deviceModel,
      osVersion,
      appVersion,
      pushToken
    });

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to update session',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Session updated successfully',
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
 * @route   POST /api/v1/sessions/:id/activity
 * @desc    Update session activity timestamp
 * @access  Public
 */
router.post('/:id/activity', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ success: false, error: 'Session ID required' });
      return;
    }

    const result = await updateSessionActivity(id);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to update activity',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Activity updated successfully',
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
 * @route   PUT /api/v1/sessions/:id/push-token
 * @desc    Update push token for session
 * @access  Public
 */
router.put('/:id/push-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    const { pushToken } = req.body;

    if (!id) {
      res.status(400).json({ success: false, error: 'Session ID required' });
      return;
    }

    if (!pushToken || typeof pushToken !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Push token is required and must be a string'
      });
      return;
    }

    const result = await updatePushToken(id, pushToken);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to update push token',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Push token updated successfully',
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
 * @route   POST /api/v1/sessions/:id/extend
 * @desc    Extend session expiration
 * @access  Public
 */
router.post('/:id/extend', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ success: false, error: 'Session ID required' });
      return;
    }
    const { additionalDays } = req.body;

    const result = await extendSession(id, additionalDays);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to extend session',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Session extended successfully',
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
 * @route   DELETE /api/v1/sessions/:id
 * @desc    Terminate session
 * @access  Public
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ success: false, error: 'Session ID required' });
      return;
    }
    const { reason } = req.body;

    const result = await terminateSession(id, reason || 'user_logout');

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to terminate session',
        message: result.error
      });
      return;
    }

    // Log activity
    const session = await getSessionById(id);
    if (session.data && req.ip) {
      await logActivity({
        userId: session.data.userId,
        sessionId: id,
        action: ActivityActions.SESSION_TERMINATED,
        metadata: {
          reason: reason || 'user_logout'
        },
        ipAddress: req.ip
      });
    }

    res.status(200).json({
      success: true,
      message: 'Session terminated successfully',
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

