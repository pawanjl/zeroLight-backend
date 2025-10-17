import { Router, Request, Response } from 'express';
import {
  getUserById,
  getUserByPrivyId,
  getUserByWalletAddress,
  createUser,
  updateUser,
  registerWallet,
  updateLastActive,
  getAllUsers,
  deleteUser
} from '../../services/userService';
import { logActivity, ActivityActions } from '../../services/activityLogService';

const router: Router = Router();

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with pagination
 * @access  Public (should be protected in production)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt((req.query['page'] as string) || '1');
    const limit = parseInt((req.query['limit'] as string) || '50');

    const result = await getAllUsers(page, limit);

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      ...result.data,
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
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'User ID is required'
      });
      return;
    }

    const result = await getUserById(id);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'User not found',
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
 * @route   GET /api/v1/users/privy/:privyId
 * @desc    Get user by Privy ID
 * @access  Public
 */
router.get('/privy/:privyId', async (req: Request, res: Response): Promise<void> => {
  try {
    const privyId = req.params['privyId'];
    if (!privyId) {
      res.status(400).json({ success: false, error: 'Privy ID required' });
      return;
    }

    const result = await getUserByPrivyId(privyId);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'User not found',
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
 * @route   GET /api/v1/users/wallet/:walletAddress
 * @desc    Get user by wallet address
 * @access  Public
 */
router.get('/wallet/:walletAddress', async (req: Request, res: Response): Promise<void> => {
  try {
    const walletAddress = req.params['walletAddress'];
    if (!walletAddress) {
      res.status(400).json({ success: false, error: 'Wallet address required' });
      return;
    }

    const result = await getUserByWalletAddress(walletAddress);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'User not found',
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
 * @route   POST /api/v1/users
 * @desc    Create a new user
 * @access  Public
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { privyId, email, phone, walletAddress } = req.body;

    // Validate required fields
    if (!privyId || typeof privyId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Privy ID is required and must be a string'
      });
      return;
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format',
          message: 'Please provide a valid email address'
        });
        return;
      }
    }

    const result = await createUser({
      privyId,
      email,
      phone,
      walletAddress
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Failed to create user',
        message: result.error
      });
      return;
    }

    // Log activity
    if (result.data && req.ip) {
      await logActivity({
        userId: result.data.id,
        action: ActivityActions.USER_REGISTER,
        metadata: {
          privyId,
          hasEmail: !!email,
          hasPhone: !!phone,
          hasWallet: !!walletAddress
        },
        ipAddress: req.ip
      });
    }

    res.status(201).json({
      success: true,
      data: result.data,
      message: 'User created successfully',
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
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Public
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ success: false, error: 'User ID required' });
      return;
    }
    const { email, phone, walletAddress, status, version } = req.body;

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format',
          message: 'Please provide a valid email address'
        });
        return;
      }
    }

    const result = await updateUser(
      id,
      {
        email,
        phone,
        walletAddress,
        status
      },
      version
    );

    if (!result.success) {
      const statusCode = result.error?.includes('modified by another request') ? 409 : 404;
      res.status(statusCode).json({
        success: false,
        error: 'Failed to update user',
        message: result.error
      });
      return;
    }

    // Log activity
    if (req.ip) {
      await logActivity({
        userId: id,
        action: ActivityActions.PROFILE_UPDATED,
        metadata: {
          updatedFields: Object.keys(req.body)
        },
        ipAddress: req.ip
      });
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'User updated successfully',
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
 * @route   POST /api/v1/users/:id/wallet
 * @desc    Register wallet for user
 * @access  Public
 */
router.post('/:id/wallet', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ success: false, error: 'User ID required' });
      return;
    }
    const { walletAddress } = req.body;

    if (!walletAddress || typeof walletAddress !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Wallet address is required and must be a string'
      });
      return;
    }

    const result = await registerWallet(id, walletAddress);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Failed to register wallet',
        message: result.error
      });
      return;
    }

    // Log activity
    if (req.ip) {
      await logActivity({
        userId: id,
        action: ActivityActions.WALLET_CONNECTED,
        metadata: {
          walletAddress
        },
        ipAddress: req.ip
      });
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Wallet registered successfully',
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
 * @route   POST /api/v1/users/:id/activity
 * @desc    Update user last active timestamp
 * @access  Public
 */
router.post('/:id/activity', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ success: false, error: 'User ID required' });
      return;
    }

    const result = await updateLastActive(id);

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
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete)
 * @access  Public (should be protected in production)
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ success: false, error: 'User ID required' });
      return;
    }

    const result = await deleteUser(id);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to delete user',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
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

