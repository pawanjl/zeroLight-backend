import { Router, Request, Response } from 'express';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  testDatabaseConnection
} from '../services/databaseService';
import { CreateUserData, UpdateUserData } from '../types';

const router: Router = Router();

// GET /api/users - Get all users
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await getAllUsers();
    
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

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID is required and must be a string'
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

// POST /api/users - Create new user
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUserData = req.body;

    // Validate required fields
    if (!userData.email || typeof userData.email !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid email',
        message: 'Email is required and must be a string'
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
      return;
    }

    const result = await createUser(userData);
    
    if (!result.success) {
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
        message: result.error
      });
      return;
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

// PUT /api/users/:id - Update user
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userData: UpdateUserData = req.body;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID is required and must be a string'
      });
      return;
    }

    // Validate email if provided
    if (userData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format',
          message: 'Please provide a valid email address'
        });
        return;
      }
    }

    const result = await updateUser(id, userData);
    
    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to update user',
        message: result.error
      });
      return;
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

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID is required and must be a string'
      });
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

// GET /api/users/health/database - Database health check
router.get('/health/database', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await testDatabaseConnection();
    
    res.status(result.success ? 200 : 500).json({
      success: result.success,
      data: {
        database: 'Supabase',
        connected: result.success,
        timestamp: new Date().toISOString()
      },
      error: result.error
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
