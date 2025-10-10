import { supabase } from '../config/supabase';
import { DatabaseResponse, User, CreateUserData, UpdateUserData } from '../types';

/**
 * Database Service
 * Handles all database operations using Supabase
 */

/**
 * Get all users
 * @returns {Promise<DatabaseResponse<User[]>>} All users
 */
export const getAllUsers = async (): Promise<DatabaseResponse<User[]>> => {
  try {
    const { data, error } = await supabase
      .from('users')
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
 * Get user by ID
 * @param {string} id - User ID
 * @returns {Promise<DatabaseResponse<User>>} User data
 */
export const getUserById = async (id: string): Promise<DatabaseResponse<User>> => {
  try {
    const { data, error } = await supabase
      .from('users')
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
 * Get user by email and address combination
 * @param {string} email - User email
 * @param {string} userAddress - User address
 * @returns {Promise<DatabaseResponse<User>>} User data
 */
export const getUserByEmailAndAddress = async (email: string, userAddress: string): Promise<DatabaseResponse<User>> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('user_address', userAddress)
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
 * Create a new user
 * @param {CreateUserData} userData - User data to create
 * @returns {Promise<DatabaseResponse<User>>} Created user
 */
export const createUser = async (userData: CreateUserData): Promise<DatabaseResponse<User>> => {
  try {
    // First check if user with same email and user_address already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, user_address')
      .eq('email', userData.email)
      .eq('user_address', userData.user_address)
      .single();

    if (existingUser) {
      return {
        data: null,
        error: 'User with this email and address combination already exists',
        success: false
      };
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{
        ...userData,
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
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
};

/**
 * Update user by ID
 * @param {string} id - User ID
 * @param {UpdateUserData} userData - User data to update
 * @returns {Promise<DatabaseResponse<User>>} Updated user
 */
export const updateUser = async (id: string, userData: UpdateUserData): Promise<DatabaseResponse<User>> => {
  try {
    // If updating email or user_address, check for unique constraint violations
    if (userData.email || userData.user_address) {
      // Get current user data to check what we're updating
      const currentUserResult = await getUserById(id);
      if (!currentUserResult.success || !currentUserResult.data) {
        return {
          data: null,
          error: 'User not found',
          success: false
        };
      }

      const currentUser = currentUserResult.data;
      const newEmail = userData.email || currentUser.email;
      const newAddress = userData.user_address || currentUser.user_address;

      // Check if another user exists with the same email and address combination
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email, user_address')
        .eq('email', newEmail)
        .eq('user_address', newAddress)
        .neq('id', id)
        .single();

      if (existingUser) {
        return {
          data: null,
          error: 'User with this email and address combination already exists',
          success: false
        };
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        ...userData,
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
 * Delete user by ID
 * @param {string} id - User ID
 * @returns {Promise<DatabaseResponse<boolean>>} Success status
 */
export const deleteUser = async (id: string): Promise<DatabaseResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('users')
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
 * Test database connection
 * @returns {Promise<DatabaseResponse<boolean>>} Connection status
 */
export const testDatabaseConnection = async (): Promise<DatabaseResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('users')
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
