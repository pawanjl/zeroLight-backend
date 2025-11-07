import { PrivyClient } from '@privy-io/server-auth';

/**
 * Privy Client Configuration
 * 
 * Used to verify Privy auth tokens from the frontend.
 * Tokens are verified using the app ID and verification key.
 */

if (!process.env['PRIVY_APP_ID']) {
  throw new Error('PRIVY_APP_ID environment variable is required');
}

if (!process.env['PRIVY_APP_SECRET']) {
  throw new Error('PRIVY_APP_SECRET environment variable is required');
}

export const privyClient = new PrivyClient(
  process.env['PRIVY_APP_ID'],
  process.env['PRIVY_APP_SECRET']
);

/**
 * Verify a Privy auth token
 * @param authToken - The Privy access token from the frontend
 * @returns Verified claims containing user information
 */
export const verifyPrivyToken = async (authToken: string) => {
  try {
    const verifiedClaims = await privyClient.verifyAuthToken(authToken);
    return {
      success: true,
      claims: verifiedClaims,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      claims: null,
      error: error instanceof Error ? error.message : 'Token verification failed'
    };
  }
};

