import { Router, Request, Response } from 'express';
import { 
  createReferralKey, 
  verifyReferralKey, 
  checkUserStatus,
  getAllPrivateBetaUsers,
  isValidEmail,
  isValidReferralKey,
  checkReferralValidity
} from '../services/privateBetaService';
import { VerifyReferralData, CheckUserStatusData } from '../types';

const router: Router = Router();

// POST /api/private-beta/referral - Create new referral key
router.post('/referral', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await createReferralKey();
    console.log("🚀 ~ result:", result)
    
    if (!result.success) {
      res.status(200).json({
        success: false,
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Referral key created successfully',
      referral_key: result.data?.referral_key
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/private-beta/verify - Verify referral key and activate user
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("🚀 ~ verify endpoint called");
    console.log("🚀 ~ request headers:", req.headers);
    console.log("🚀 ~ request body:", req.body);
    console.log("🚀 ~ request body type:", typeof req.body);
    console.log("🚀 ~ request body keys:", Object.keys(req.body || {}));
    
    const { referral_key, user_email } = req.body;
    console.log("🚀 ~ user_email:", user_email, "type:", typeof user_email)
    console.log("🚀 ~ referral_key:", referral_key, "type:", typeof referral_key)
    console.log("🚀 ~ verify request body:", { referral_key, user_email });

    // Validate required fields
    if (!referral_key || typeof referral_key !== 'string') {
      console.log("🚀 ~ validation error: invalid referral_key");
      res.status(200).json({
        success: false,
        message: 'Referral key is required and must be a string'
      });
      return;
    }

    if (!user_email || typeof user_email !== 'string') {
      console.log("🚀 ~ validation error: invalid user_email");
      res.status(200).json({
        success: false,
        message: 'User email is required and must be a string'
      });
      return;
    }

    // Validate email format
    if (!isValidEmail(user_email)) {
      console.log("🚀 ~ validation error: invalid email format");
      res.status(200).json({
        success: false,
        message: 'Please provide a valid email address'
      });
      return;
    }

    const data: VerifyReferralData = {
      referral_key,
      user_email
    };
    console.log("🚀 ~ data:", data)

    console.log("🚀 ~ calling verifyReferralKey with data:", data);
    const result = await verifyReferralKey(data);
    console.log("🚀 ~ verifyReferralKey result:", result);
    
    if (!result.success) {
      res.status(200).json({
        success: false,
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Referral key verified and user activated successfully'
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/private-beta/check-validity - Check if referral key is valid (status: active)
router.post('/check-validity', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("🚀 ~ check-validity endpoint called");
    console.log("🚀 ~ request headers:", req.headers);
    console.log("🚀 ~ request body:", req.body);
    
    const { referral_key } = req.body;
    console.log("🚀 ~ referral_key:", referral_key, "type:", typeof referral_key);

    // Validate required fields
    if (!referral_key || typeof referral_key !== 'string') {
      console.log("🚀 ~ validation error: invalid referral_key");
      res.status(200).json({
        success: false,
        message: 'Referral key is required and must be a string'
      });
      return;
    }

    console.log("🚀 ~ calling checkReferralValidity with referral_key:", referral_key);
    const result = await checkReferralValidity(referral_key);
    console.log("🚀 ~ checkReferralValidity result:", result);
    
    if (!result.success) {
      res.status(200).json({
        success: false,
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Referral key is valid and active'
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/private-beta/status - Check user status by email
router.post('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_email } = req.body;

    // Validate required fields
    if (!user_email || typeof user_email !== 'string') {
      res.status(200).json({
        success: false,
        message: 'User email is required and must be a string'
      });
      return;
    }

    // Validate email format
    if (!isValidEmail(user_email)) {
      res.status(200).json({
        success: false,
        message: 'Please provide a valid email address'
      });
      return;
    }

    const data: CheckUserStatusData = {
      user_email
    };

    const result = await checkUserStatus(data);
    
    if (!result.success) {
      res.status(200).json({
        success: false,
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User status retrieved successfully'
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/private-beta/users - Get all private beta users (admin endpoint)
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await getAllPrivateBetaUsers();
    
    if (!result.success) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch private beta users',
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

// GET /api/private-beta/debug - Debug endpoint to see all referral keys
router.get('/debug', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await getAllPrivateBetaUsers();
    
    res.status(200).json({
      success: true,
      data: result.data,
      count: result.data?.length || 0,
      message: 'Debug: All referral keys in database',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
