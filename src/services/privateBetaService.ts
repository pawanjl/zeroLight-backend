import { supabase } from '../config/supabase';
import { DatabaseResponse, PrivateBetaUser, VerifyReferralData, CheckUserStatusData } from '../types';

/**
 * Private Beta Service
 * Handles private beta referral system with unique 6-digit numeric keys
 */

/**
 * Generate a unique 6-digit numeric referral key
 * @returns {string} Unique referral key
 */
const generateReferralKey = (): string => {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Check if referral key already exists
 * @param {string} key - Key to check
 * @returns {Promise<boolean>} True if exists
 */
const isReferralKeyExists = async (key: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('private_beta_users')
      .select('id')
      .eq('referral_key', key)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
};

/**
 * Generate a unique referral key that doesn't exist in database
 * @returns {Promise<string>} Unique referral key
 */
const generateUniqueReferralKey = async (): Promise<string> => {
  let key: string;
  let exists = true;
  
  // Keep generating until we find a unique key
  while (exists) {
    key = generateReferralKey();
    exists = await isReferralKeyExists(key);
  }
  
  return key!;
};

/**
 * Create a new referral key
 * @returns {Promise<DatabaseResponse<PrivateBetaUser>>} Created referral
 */
export const createReferralKey = async (): Promise<DatabaseResponse<PrivateBetaUser>> => {
  try {
    const referralKey = await generateUniqueReferralKey();
    console.log("🚀 ~ createReferralKey ~ referralKey:", referralKey)

    const { data: result, error } = await supabase
    .from('private_beta_users')
    .insert([{
      referral_key: referralKey,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
    console.log("🚀 ~ createReferralKey ~ result:", result)

    if (error) {
      return {
        data: null,
        error: error.message,
        success: false
      };
    }

    return {
      data: result,
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
 * Verify referral key and activate user
 * @param {VerifyReferralData} data - Verification data
 * @returns {Promise<DatabaseResponse<PrivateBetaUser>>} Updated user
 */
export const verifyReferralKey = async (data: VerifyReferralData): Promise<DatabaseResponse<PrivateBetaUser>> => {
  try {
    const { referral_key, user_email } = data;
    console.log("🚀 ~ verifyReferralKey ~ looking for referral_key:", referral_key);

    // First, let's check if the referral key exists at all (regardless of status)
    const { data: allReferrals, error: allError } = await supabase
      .from('private_beta_users')
      .select('*')
      .eq('referral_key', referral_key);

    console.log("🚀 ~ verifyReferralKey ~ all referrals with this key:", allReferrals);
    console.log("🚀 ~ verifyReferralKey ~ all error:", allError);

    // If no referrals found at all, return error
    if (!allReferrals || allReferrals.length === 0) {
      console.log("🚀 ~ verifyReferralKey ~ no referrals found with this key");
      return {
        data: null,
        error: 'Referral code not found',
        success: false
      };
    }

    // Check if any referral has pending status
    const pendingReferral = allReferrals.find(ref => ref.status === 'pending');
    console.log("🚀 ~ verifyReferralKey ~ pendingReferral:", pendingReferral);

    if (!pendingReferral) {
      console.log("🚀 ~ verifyReferralKey ~ no pending referrals found");
      return {
        data: null,
        error: 'Referral code has already been used',
        success: false
      };
    }

    const existingReferral = pendingReferral;

    // Check if email is already used
    const { data: existingUser, error: emailError } = await supabase
      .from('private_beta_users')
      .select('*')
      .eq('user_email', user_email)
      .single();

    if (existingUser && !emailError) {
      return {
        data: null,
        error: 'Email already registered',
        success: false
      };
    }

    // Update the referral to active status
    const { data: updatedReferral, error: updateError } = await supabase
      .from('private_beta_users')
      .update({
        status: 'active',
        user_email: user_email,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingReferral.id)
      .select()
      .single();

    if (updateError) {
      return {
        data: null,
        error: updateError.message,
        success: false
      };
    }

    return {
      data: updatedReferral,
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
 * Check user status by email
 * @param {CheckUserStatusData} data - User email data
 * @returns {Promise<DatabaseResponse<PrivateBetaUser>>} User status
 */
export const checkUserStatus = async (data: CheckUserStatusData): Promise<DatabaseResponse<PrivateBetaUser>> => {
  try {
    const { user_email } = data;

    const { data: user, error } = await supabase
      .from('private_beta_users')
      .select('*')
      .eq('user_email', user_email)
      .single();

    if (error) {
      return {
        data: null,
        error: 'User not found',
        success: false
      };
    }

    return {
      data: user,
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
 * Get all private beta users (for debugging)
 * @returns {Promise<DatabaseResponse<PrivateBetaUser[]>>} All users
 */
export const getAllPrivateBetaUsers = async (): Promise<DatabaseResponse<PrivateBetaUser[]>> => {
  try {
    const { data, error } = await supabase
      .from('private_beta_users')
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
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate referral key format (6-digit numeric)
 * @param {string} key - Key to validate
 * @returns {boolean} True if valid
 */
export const isValidReferralKey = (key: string): boolean => {
  const numericRegex = /^[0-9]{6}$/;
  return typeof key === 'string' && numericRegex.test(key);
};

/**
 * Check if referral key is valid (exists in database with status 'active')
 * @param {string} referral_key - Referral key to check
 * @returns {Promise<DatabaseResponse<PrivateBetaUser>>} Referral validity result
 */
export const checkReferralValidity = async (referral_key: string): Promise<DatabaseResponse<PrivateBetaUser>> => {
  try {
    console.log("🚀 ~ checkReferralValidity ~ checking referral_key:", referral_key);

    // First validate the format
    if (!isValidReferralKey(referral_key)) {
      return {
        data: null,
        error: 'Invalid referral key format',
        success: false
      };
    }

    // Check if referral exists with active status
    const { data: referral, error } = await supabase
      .from('private_beta_users')
      .select('*')
      .eq('referral_key', referral_key)
      .eq('status', 'pending')
      .single();

    console.log("🚀 ~ checkReferralValidity ~ referral:", referral);
    console.log("🚀 ~ checkReferralValidity ~ error:", error);

    if (error || !referral) {
      return {
        data: null,
        error: 'Referral key not found or not active',
        success: false
      };
    }

    return {
      data: referral,
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
