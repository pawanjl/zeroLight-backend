import { Router, Request, Response } from 'express';
import { 
  getAllDevices, 
  getDeviceById, 
  getDevicesByUserid,
  getDeviceByDeviceId,
  findDeviceByParams,
  updateDeviceByParams,
  upsertDevice,
  createDevice, 
  updateDevice, 
  deleteDevice,
  updateDeviceStatus,
  testDeviceDatabaseConnection
} from '../services/deviceService';
import { CreateDeviceData, UpdateDeviceData } from '../types';

const router: Router = Router();

// GET /api/devices - Get all devices
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await getAllDevices();
    
    if (!result.success) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch devices',
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

// GET /api/devices/:id - Get device by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid device ID',
        message: 'Device ID is required and must be a string'
      });
      return;
    }

    const result = await getDeviceById(id);
    
    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Device not found',
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

// GET /api/devices/user/:userid - Get devices by userid
router.get('/user/:userid', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userid } = req.params;

    if (!userid || typeof userid !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid userid',
        message: 'Userid is required and must be a string'
      });
      return;
    }

    const result = await getDevicesByUserid(userid);
    
    if (!result.success) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch devices',
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

// GET /api/devices/by-device-id/:device_id - Get device by device_id
router.get('/by-device-id/:device_id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { device_id } = req.params;

    if (!device_id || typeof device_id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid device_id',
        message: 'Device ID is required and must be a string'
      });
      return;
    }

    const result = await getDeviceByDeviceId(device_id);
    
    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Device not found',
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

// GET /api/devices/find - Find device by device_id, userid, and installation_time
router.get('/find', async (req: Request, res: Response): Promise<void> => {
  try {
    const { device_id, userid, installation_time } = req.query;

    // Validate required parameters
    if (!device_id || typeof device_id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid device_id',
        message: 'Device ID is required and must be a string'
      });
      return;
    }

    if (!userid || typeof userid !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid userid',
        message: 'User ID is required and must be a string'
      });
      return;
    }

    if (!installation_time || typeof installation_time !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid installation_time',
        message: 'Installation time is required and must be a string'
      });
      return;
    }

    const result = await findDeviceByParams(device_id, userid, installation_time);

    if (!result.success) {
      res.status(200).json({
        success: true,
        data: false,
        message: 'Device not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Device found',
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

// PUT /api/devices/update-by-params - Update device by device_id, userid, and installation_time
router.put('/update-by-params', async (req: Request, res: Response): Promise<void> => {
  try {
    const { device_id, userid, installation_time } = req.query;
    const updateData: UpdateDeviceData = req.body;

    // Validate required parameters
    if (!device_id || typeof device_id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid device_id',
        message: 'Device ID is required and must be a string'
      });
      return;
    }

    if (!userid || typeof userid !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid userid',
        message: 'User ID is required and must be a string'
      });
      return;
    }

    if (!installation_time || typeof installation_time !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid installation_time',
        message: 'Installation time is required and must be a string'
      });
      return;
    }

    // Validate update data
    if (!updateData || Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid update data',
        message: 'Update data is required and must not be empty'
      });
      return;
    }

    // Validate platform if provided
    if (updateData.platform && updateData.platform !== 'ios' && updateData.platform !== 'android') {
      res.status(400).json({
        success: false,
        error: 'Invalid platform',
        message: 'Platform must be either "ios" or "android"'
      });
      return;
    }

    // Validate status if provided
    if (updateData.status !== undefined && updateData.status !== 1 && updateData.status !== 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'Status must be either 1 or 0'
      });
      return;
    }

    // Validate deviceinfo if provided
    if (updateData.deviceinfo && (typeof updateData.deviceinfo !== 'object' || Array.isArray(updateData.deviceinfo))) {
      res.status(400).json({
        success: false,
        error: 'Invalid deviceinfo',
        message: 'Deviceinfo must be an object (not array or primitive)'
      });
      return;
    }

    const result = await updateDeviceByParams(device_id, userid, installation_time, updateData);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to update device',
        message: result.error || 'Device not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Device updated successfully',
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

// POST /api/devices/upsert - Upsert device (update if exists, create if not exists)
router.post('/upsert', async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceData: CreateDeviceData = req.body;

    // Validate required fields
    if (!deviceData.userid || typeof deviceData.userid !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid userid',
        message: 'User ID is required and must be a string'
      });
      return;
    }

    if (!deviceData.pushtoken || typeof deviceData.pushtoken !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid pushtoken',
        message: 'Pushtoken is required and must be a string'
      });
      return;
    }

    if (!deviceData.installation_time || typeof deviceData.installation_time !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid installation_time',
        message: 'Installation time is required and must be a string'
      });
      return;
    }

    if (!deviceData.device_id || typeof deviceData.device_id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid device_id',
        message: 'Device ID is required and must be a string'
      });
      return;
    }

    if (!deviceData.platform || (deviceData.platform !== 'ios' && deviceData.platform !== 'android')) {
      res.status(400).json({
        success: false,
        error: 'Invalid platform',
        message: 'Platform is required and must be either "ios" or "android"'
      });
      return;
    }

    if (deviceData.status !== 1 && deviceData.status !== 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'Status must be either 1 or 0'
      });
      return;
    }

    if (!deviceData.deviceinfo || typeof deviceData.deviceinfo !== 'object' || Array.isArray(deviceData.deviceinfo)) {
      res.status(400).json({
        success: false,
        error: 'Invalid deviceinfo',
        message: 'Deviceinfo is required and must be an object (not array or primitive)'
      });
      return;
    }

    const result = await upsertDevice(deviceData);

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: 'Failed to upsert device',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Device upserted successfully',
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

// POST /api/devices - Create new device
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceData: CreateDeviceData = req.body;
    console.log("🚀 ~ deviceData:", deviceData)

    // Validate required fields
    if (!deviceData.userid || typeof deviceData.userid !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid userid',
        message: 'Userid is required and must be a string'
      });
      return;
    }

    if (!deviceData.pushtoken || typeof deviceData.pushtoken !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid pushtoken',
        message: 'Pushtoken is required and must be a string'
      });
      return;
    }

    if (!deviceData.installation_time || typeof deviceData.installation_time !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid installation_time',
        message: 'Installation time is required and must be a string'
      });
      return;
    }

    if (!deviceData.device_id || typeof deviceData.device_id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid device_id',
        message: 'Device ID is required and must be a string'
      });
      return;
    }

    if (!deviceData.platform || (deviceData.platform !== 'ios' && deviceData.platform !== 'android')) {
      res.status(400).json({
        success: false,
        error: 'Invalid platform',
        message: 'Platform is required and must be either "ios" or "android"'
      });
      return;
    }

    if (deviceData.status !== 1 && deviceData.status !== 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'Status must be either 1 or 0'
      });
      return;
    }

    if (!deviceData.deviceinfo || typeof deviceData.deviceinfo !== 'object' || Array.isArray(deviceData.deviceinfo)) {
      res.status(400).json({
        success: false,
        error: 'Invalid deviceinfo',
        message: 'Deviceinfo is required and must be an object (not array or primitive)'
      });
      return;
    }

    const result = await createDevice(deviceData);
    console.log("🚀 ~ result:", result)
    
    if (!result.success) {
      res.status(500).json({
        success: false,
        error: 'Failed to create device',
        message: result.error
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: result.data,
      message: 'Device created successfully',
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

// PUT /api/devices/:id - Update device
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deviceData: UpdateDeviceData = req.body;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid device ID',
        message: 'Device ID is required and must be a string'
      });
      return;
    }

    // Validate platform if provided
    if (deviceData.platform && deviceData.platform !== 'ios' && deviceData.platform !== 'android') {
      res.status(400).json({
        success: false,
        error: 'Invalid platform',
        message: 'Platform must be either "ios" or "android"'
      });
      return;
    }

    // Validate status if provided
    if (deviceData.status !== undefined && deviceData.status !== 1 && deviceData.status !== 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'Status must be either 1 or 0'
      });
      return;
    }

    // Validate deviceinfo if provided
    if (deviceData.deviceinfo && (typeof deviceData.deviceinfo !== 'object' || Array.isArray(deviceData.deviceinfo))) {
      res.status(400).json({
        success: false,
        error: 'Invalid deviceinfo',
        message: 'Deviceinfo must be an object (not array or primitive)'
      });
      return;
    }

    const result = await updateDevice(id, deviceData);
    
    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to update device',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Device updated successfully',
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

// PATCH /api/devices/:id/status - Update device status
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid device ID',
        message: 'Device ID is required and must be a string'
      });
      return;
    }

    if (status !== 1 && status !== 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'Status must be either 1 or 0'
      });
      return;
    }

    const result = await updateDeviceStatus(id, status);
    
    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to update device status',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Device status updated successfully',
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

// DELETE /api/devices/:id - Delete device
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid device ID',
        message: 'Device ID is required and must be a string'
      });
      return;
    }

    const result = await deleteDevice(id);
    
    if (!result.success) {
      res.status(404).json({
        success: false,
        error: 'Failed to delete device',
        message: result.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Device deleted successfully',
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

// GET /api/devices/health/database - Database health check
router.get('/health/database', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await testDeviceDatabaseConnection();
    
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
