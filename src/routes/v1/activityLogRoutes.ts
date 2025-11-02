import { Router, Request, Response } from 'express';
import {
    getActivityLogs,
    getUserRecentActivity,
    getActivityStats,
    ActivityLogFilters
} from '../../services/activityLogService';

const router: Router = Router();

/**
 * @route   GET /api/v1/activity-logs
 * @desc    Get activity logs with filters and pagination
 * @access  Public
 * @query   userId, sessionId, action, startDate, endDate, page, limit
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt((req.query['page'] as string) || '1');
        const limit = parseInt((req.query['limit'] as string) || '50');

        const filters: ActivityLogFilters = {};

        if (req.query['userId']) {
            filters.userId = req.query['userId'] as string;
        }

        if (req.query['sessionId']) {
            filters.sessionId = req.query['sessionId'] as string;
        }

        if (req.query['action']) {
            filters.action = req.query['action'] as string;
        }

        if (req.query['startDate']) {
            filters.startDate = new Date(req.query['startDate'] as string);
        }

        if (req.query['endDate']) {
            filters.endDate = new Date(req.query['endDate'] as string);
        }

        const result = await getActivityLogs(filters, page, limit);

        if (!result.success) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch activity logs',
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
 * @route   GET /api/v1/activity-logs/user/:userId/recent
 * @desc    Get recent activity logs for a specific user
 * @access  Public
 * @query   limit (default: 20)
 */
router.get('/user/:userId/recent', async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params['userId'];
        if (!userId) {
            res.status(400).json({ success: false, error: 'User ID required' });
            return;
        }

        const limit = parseInt((req.query['limit'] as string) || '20');

        const result = await getUserRecentActivity(userId, limit);

        if (!result.success) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch activity logs',
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
 * @route   GET /api/v1/activity-logs/stats
 * @desc    Get activity log statistics
 * @access  Public
 * @query   userId, startDate, endDate
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.query['userId'] as string | undefined;
        const startDate = req.query['startDate']
            ? new Date(req.query['startDate'] as string)
            : undefined;
        const endDate = req.query['endDate']
            ? new Date(req.query['endDate'] as string)
            : undefined;

        const result = await getActivityStats(userId, startDate, endDate);

        if (!result.success) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch activity statistics',
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

export default router;


