import { supabase } from '../config/supabase';
import { DatabaseResponse, Device, CreateDeviceData, UpdateDeviceData } from '../types';

/**
 * Device Service
 * Handles all device-related database operations using Supabase
 */

/**
 * Get all devices
 * @returns {Promise<DatabaseResponse<Device[]>>} All devices
 */
export const getAllDevices = async (): Promise<DatabaseResponse<Device[]>> => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        data: null,
        error: error.message,
        success: false
      };
    }

    return {
      data: data || [],
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
 * Get device by ID
 * @param {string} id - Device ID
 * @returns {Promise<DatabaseResponse<Device>>} Device data
 */
export const getDeviceById = async (id: string): Promise<DatabaseResponse<Device>> => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return {
        data: null,
        error: error.message,
        success: false
      };
    }

    return {
      data,
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
 * Get devices by userid
 * @param {string} userid - User ID
 * @returns {Promise<DatabaseResponse<Device[]>>} Devices for the user
 */
export const getDevicesByUserid = async (userid: string): Promise<DatabaseResponse<Device[]>> => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('userid', userid)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        data: null,
        error: error.message,
        success: false
      };
    }

    return {
      data: data || [],
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
 * Get device by device_id
 * @param {string} device_id - Device ID
 * @returns {Promise<DatabaseResponse<Device>>} Device data
 */
export const getDeviceByDeviceId = async (device_id: string): Promise<DatabaseResponse<Device>> => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('device_id', device_id)
      .single();

    if (error) {
      return {
        data: null,
        error: error.message,
        success: false
      };
    }

    return {
      data,
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
 * Create a new device
 * @param {CreateDeviceData} deviceData - Device data to create
 * @returns {Promise<DatabaseResponse<Device>>} Created device
 */
export const createDevice = async (deviceData: CreateDeviceData): Promise<DatabaseResponse<Device>> => {
  try {
    // First check if user exists in users table
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('userid', deviceData.userid)
      .single();

    if (!existingUser) {
      return {
        data: null,
        error: 'User not found',
        success: false
      };
    }

    // Check if device with same device_id already exists
    const { data: existingDevice, error: checkError } = await supabase
      .from('devices')
      .select('id, device_id')
      .eq('device_id', deviceData.device_id)
      .single();

    if (existingDevice) {
      return {
        data: null,
        error: 'Device with this device_id already exists',
        success: false
      };
    }


    console.log("🚀 ~ createDevice ~ deviceData:", deviceData.deviceinfo)
    
    // If creating device with status 1, set all other devices for this user to status 0
    if (deviceData.status === 1) {
      const { error: updateError } = await supabase
        .from('devices')
        .update({ 
          status: 0,
          updated_at: new Date().toISOString()
        })
        .eq('userid', deviceData.userid);

      if (updateError) {
        return {
          data: null,
          error: `Failed to update existing devices: ${updateError.message}`,
          success: false
        };
      }
    }

    const { data, error } = await supabase
    .from('devices')
    .insert([{
      ...deviceData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

    console.log("🚀 ~ createDevice ~ error:", error)

    if (error) {
      return {
        data: null,
        error: error.message,
        success: false
      };
    }

    return {
      data,
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
 * Update device by ID
 * @param {string} id - Device ID
 * @param {UpdateDeviceData} deviceData - Device data to update
 * @returns {Promise<DatabaseResponse<Device>>} Updated device
 */
export const updateDevice = async (id: string, deviceData: UpdateDeviceData): Promise<DatabaseResponse<Device>> => {
  try {
    // If updating device_id, check for unique constraint violations
    if (deviceData.device_id) {
      // Check if another device exists with the same device_id
      const { data: existingDevice, error: checkError } = await supabase
        .from('devices')
        .select('id, device_id')
        .eq('device_id', deviceData.device_id)
        .neq('id', id)
        .single();

      if (existingDevice) {
        return {
          data: null,
          error: 'Device with this device_id already exists',
          success: false
        };
      }
    }

    // If updating device to status 1, set all other devices for this user to status 0
    if (deviceData.status === 1) {
      // First get the current device to find the userid
      const { data: currentDevice, error: getError } = await supabase
        .from('devices')
        .select('userid')
        .eq('id', id)
        .single();

      if (getError) {
        return {
          data: null,
          error: `Failed to get current device: ${getError.message}`,
          success: false
        };
      }

      // Update all other devices for this user to status 0
      const { error: updateError } = await supabase
        .from('devices')
        .update({ 
          status: 0,
          updated_at: new Date().toISOString()
        })
        .eq('userid', currentDevice.userid)
        .neq('id', id);

      if (updateError) {
        return {
          data: null,
          error: `Failed to update existing devices: ${updateError.message}`,
          success: false
        };
      }
    }

    const { data, error } = await supabase
      .from('devices')
      .update({
        ...deviceData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: error.message,
        success: false
      };
    }

    return {
      data,
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
 * Delete device by ID
 * @param {string} id - Device ID
 * @returns {Promise<DatabaseResponse<boolean>>} Success status
 */
export const deleteDevice = async (id: string): Promise<DatabaseResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id);

    if (error) {
      return {
        data: null,
        error: error.message,
        success: false
      };
    }

    return {
      data: true,
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
 * Update device status by ID
 * @param {string} id - Device ID
 * @param {1 | 0} status - New status
 * @returns {Promise<DatabaseResponse<Device>>} Updated device
 */
export const updateDeviceStatus = async (id: string, status: 1 | 0): Promise<DatabaseResponse<Device>> => {
  try {
    // If updating device to status 1, set all other devices for this user to status 0
    if (status === 1) {
      // First get the current device to find the userid
      const { data: currentDevice, error: getError } = await supabase
        .from('devices')
        .select('userid')
        .eq('id', id)
        .single();

      if (getError) {
        return {
          data: null,
          error: `Failed to get current device: ${getError.message}`,
          success: false
        };
      }

      // Update all other devices for this user to status 0
      const { error: updateError } = await supabase
        .from('devices')
        .update({ 
          status: 0,
          updated_at: new Date().toISOString()
        })
        .eq('userid', currentDevice.userid)
        .neq('id', id);

      if (updateError) {
        return {
          data: null,
          error: `Failed to update existing devices: ${updateError.message}`,
          success: false
        };
      }
    }

    const { data, error } = await supabase
      .from('devices')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: error.message,
        success: false
      };
    }

    return {
      data,
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
 * Upsert device - Update if exists, create if not exists
 * @param {CreateDeviceData} deviceData - Device data
 * @returns {Promise<DatabaseResponse<Device>>} Updated or created device
 */
export const upsertDevice = async (deviceData: CreateDeviceData): Promise<DatabaseResponse<Device>> => {
  try {
    // First check if user exists in users table
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('userid', deviceData.userid)
      .single();

    if (!existingUser) {
      return {
        data: null,
        error: 'User not found',
        success: false
      };
    }

    // Check if device exists with same device_id, userid, and installation_time
    const { data: existingDevice, error: findError } = await supabase
      .from('devices')
      .select('*')
      .eq('device_id', deviceData.device_id)
      .eq('userid', deviceData.userid)
      .eq('installation_time', deviceData.installation_time)
      .single();

    // If device exists, update it
    if (existingDevice) {
      // If updating device to status 1, set all other devices for this user to status 0
      if (deviceData.status === 1) {
        const { error: updateError } = await supabase
          .from('devices')
          .update({ 
            status: 0,
            updated_at: new Date().toISOString()
          })
          .eq('userid', deviceData.userid)
          .neq('device_id', deviceData.device_id);

        if (updateError) {
          return {
            data: null,
            error: `Failed to update existing devices: ${updateError.message}`,
            success: false
          };
        }
      }

      // Update the existing device
      const { data, error } = await supabase
        .from('devices')
        .update({
          ...deviceData,
          updated_at: new Date().toISOString()
        })
        .eq('device_id', deviceData.device_id)
        .eq('userid', deviceData.userid)
        .eq('installation_time', deviceData.installation_time)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      return {
        data,
        error: null,
        success: true
      };
    } else {
      // Device doesn't exist, create new one
      // If creating device with status 1, set all other devices for this user to status 0
      if (deviceData.status === 1) {
        const { error: updateError } = await supabase
          .from('devices')
          .update({ 
            status: 0,
            updated_at: new Date().toISOString()
          })
          .eq('userid', deviceData.userid);

        if (updateError) {
          return {
            data: null,
            error: `Failed to update existing devices: ${updateError.message}`,
            success: false
          };
        }
      }

      // Create new device
      const { data, error } = await supabase
        .from('devices')
        .insert([{
          ...deviceData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      return {
        data,
        error: null,
        success: true
      };
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Update device by device_id, userid, and installation_time
 * @param {string} device_id - Device ID
 * @param {string} userid - User ID
 * @param {string} installation_time - Installation time
 * @param {UpdateDeviceData} updateData - Data to update
 * @returns {Promise<DatabaseResponse<Device>>} Updated device data or null if not found
 */
export const updateDeviceByParams = async (device_id: string, userid: string, installation_time: string, updateData: UpdateDeviceData): Promise<DatabaseResponse<Device>> => {
  try {
    // If updating device to status 1, set all other devices for this user to status 0
    if (updateData.status === 1) {
      const { error: updateError } = await supabase
        .from('devices')
        .update({ 
          status: 0,
          updated_at: new Date().toISOString()
        })
        .eq('userid', userid)
        .neq('device_id', device_id);

      if (updateError) {
        return {
          data: null,
          error: `Failed to update existing devices: ${updateError.message}`,
          success: false
        };
      }
    }

    // If updating device_id, check for uniqueness
    if (updateData.device_id && updateData.device_id !== device_id) {
      const { data: existingDevice, error: checkError } = await supabase
        .from('devices')
        .select('id')
        .eq('device_id', updateData.device_id)
        .single();

      if (existingDevice) {
        return {
          data: null,
          error: 'Device with this device_id already exists',
          success: false
        };
      }
    }

    const { data, error } = await supabase
      .from('devices')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('device_id', device_id)
      .eq('userid', userid)
      .eq('installation_time', installation_time)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: error.message,
        success: false
      };
    }

    return {
      data,
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
 * Find device by device_id, userid, and installation_time
 * @param {string} device_id - Device ID
 * @param {string} userid - User ID
 * @param {string} installation_time - Installation time
 * @returns {Promise<DatabaseResponse<Device>>} Device data or null if not found
 */
export const findDeviceByParams = async (device_id: string, userid: string, installation_time: string): Promise<DatabaseResponse<Device>> => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('device_id', device_id)
      .eq('userid', userid)
      .eq('installation_time', installation_time)
      .single();

    if (error) {
      return {
        data: null,
        error: null, // Don't return error message for not found cases
        success: false
      };
    }

    return {
      data,
      error: null,
      success: true
    };
  } catch (error) {
    return {
      data: null,
      error: null, // Don't return error message for not found cases
      success: false
    };
  }
};

/**
 * Test database connection for devices
 * @returns {Promise<DatabaseResponse<boolean>>} Connection status
 */
export const testDeviceDatabaseConnection = async (): Promise<DatabaseResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('devices')
      .select('id')
      .limit(1);

    if (error) {
      return {
        data: null,
        error: error.message,
        success: false
      };
    }

    return {
      data: true,
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
