import { prisma } from '../config/prisma';
import { DatabaseResponse, PrivateBetaUser, VerifyReferralData, CheckUserStatusData } from '../types';

/**
 * Private Beta Service
 * Handles private beta referral system with unique 6-digit numeric keys
 */

/**
 * Generate a random 6-digit numeric referral key
 * @returns {string} 6-digit referral key
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
    const existing = await prisma.privateBetaUser.findUnique({
      where: { referralKey: key }
    });
    return !!existing;
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

    const result = await prisma.privateBetaUser.create({
      data: {
        referralKey,
        status: 'pending'
      }
    });
    console.log("🚀 ~ createReferralKey ~ result:", result)

    return {
      data: {
        ...result,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString()
      } as PrivateBetaUser,
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

    // First, check if the referral key exists
    const allReferrals = await prisma.privateBetaUser.findMany({
      where: { referralKey: referral_key }
    });

    console.log("🚀 ~ verifyReferralKey ~ all referrals with this key:", allReferrals);

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
    const pendingReferral = allReferrals.find((ref: any) => ref.status === 'pending');
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
    const existingUser = await prisma.privateBetaUser.findFirst({
      where: { userEmail: user_email }
    });

    if (existingUser) {
      return {
        data: null,
        error: 'Email already registered',
        success: false
      };
    }

    // Update the referral to active status
    const updatedReferral = await prisma.privateBetaUser.update({
      where: { id: existingReferral.id },
      data: {
        status: 'active',
        userEmail: user_email,
        updatedAt: new Date()
      }
    });

    return {
      data: {
        ...updatedReferral,
        createdAt: updatedReferral.createdAt.toISOString(),
        updatedAt: updatedReferral.updatedAt.toISOString()
      } as PrivateBetaUser,
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

    const user = await prisma.privateBetaUser.findFirst({
      where: { userEmail: user_email }
    });

    if (!user) {
      return {
        data: null,
        error: 'User not found',
        success: false
      };
    }

    return {
      data: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      } as PrivateBetaUser,
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
 * Get all private beta users
 * @returns {Promise<DatabaseResponse<PrivateBetaUser[]>>} All users
 */
export const getAllPrivateBetaUsers = async (): Promise<DatabaseResponse<PrivateBetaUser[]>> => {
  try {
    const users = await prisma.privateBetaUser.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      data: users.map((u: any) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString()
      })) as PrivateBetaUser[],
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
 * Check if referral key is valid (status: active or pending)
 * @param {string} referralKey - Referral key to check
 * @returns {Promise<DatabaseResponse<boolean>>} Validity status
 */
export const checkReferralValidity = async (referralKey: string): Promise<DatabaseResponse<boolean>> => {
  try {
    const referral = await prisma.privateBetaUser.findUnique({
      where: { referralKey }
    });

    if (!referral) {
      return {
        data: null,
        error: 'Referral key not found',
        success: false
      };
    }

    // Check if status is 'active' (we only consider active keys as valid)
    if (referral.status !== 'active') {
      return {
        data: null,
        error: 'Referral key is not active',
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
 * Create multiple referral keys at once
 * @param {number} count - Number of referral keys to create
 * @returns {Promise<DatabaseResponse<PrivateBetaUser[]>>} Created referrals
 */
export const createMultipleReferralKeys = async (count: number): Promise<DatabaseResponse<PrivateBetaUser[]>> => {
  try {
    if (count <= 0 || count > 100) {
      return {
        data: null,
        error: 'Count must be between 1 and 100',
        success: false
      };
    }

    const referralKeys: string[] = [];

    // Generate unique keys
    for (let i = 0; i < count; i++) {
      const key = await generateUniqueReferralKey();
      referralKeys.push(key);
    }

    // Create all referrals in a single transaction
    const createdReferrals = await prisma.$transaction(
      referralKeys.map(key =>
        prisma.privateBetaUser.create({
          data: {
            referralKey: key,
            status: 'pending'
          }
        })
      )
    );

    return {
      data: createdReferrals.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      })) as PrivateBetaUser[],
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
 * Get all unused (pending) referral keys
 * @returns {Promise<DatabaseResponse<PrivateBetaUser[]>>} Unused referrals
 */
export const getUnusedReferrals = async (): Promise<DatabaseResponse<PrivateBetaUser[]>> => {
  try {
    const unusedReferrals = await prisma.privateBetaUser.findMany({
      where: {
        status: 'pending'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      data: unusedReferrals.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      })) as PrivateBetaUser[],
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
