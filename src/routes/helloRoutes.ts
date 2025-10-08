import { Router, Request, Response } from 'express';
import { getHelloMessage, getPersonalizedMessage } from '../services/helloService';

const router: Router = Router();

// GET /api/hello
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const message: string = await getHelloMessage();
    res.status(200).json({
      success: true,
      message: message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get hello message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/hello/:name
router.get('/:name', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    const message: string = await getPersonalizedMessage(name);
    res.status(200).json({
      success: true,
      message: message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get personalized message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
