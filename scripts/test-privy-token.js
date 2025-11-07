#!/usr/bin/env node

/**
 * Privy Token Verification Test Script
 * 
 * Test Privy token verification standalone without running the full server.
 * 
 * Usage:
 *   node scripts/test-privy-token.js <PRIVY_ACCESS_TOKEN>
 * 
 * Or with environment variables:
 *   PRIVY_TOKEN="your-token-here" node scripts/test-privy-token.js
 */

require('dotenv').config();
const { PrivyClient } = require('@privy-io/server-auth');
const jwt = require('jsonwebtoken');

/**
 * Colors for console output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator() {
  console.log('='.repeat(70));
}

/**
 * Test Privy token verification
 */
async function testPrivyToken(token) {
  separator();
  log('🔐 Privy Token Verification Test', 'cyan');
  separator();
  console.log('');

  // Check environment variables
  log('📋 Checking Environment Variables...', 'blue');
  console.log('');
  
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId) {
    log('❌ PRIVY_APP_ID is not set', 'red');
    log('   Set it in your .env file or environment', 'yellow');
    process.exit(1);
  }

  if (!appSecret) {
    log('❌ PRIVY_APP_SECRET is not set', 'red');
    log('   Set it in your .env file or environment', 'yellow');
    process.exit(1);
  }

  log(`✅ PRIVY_APP_ID: ${appId.substring(0, 10)}...`, 'green');
  log(`✅ PRIVY_APP_SECRET: ${appSecret.substring(0, 10)}...****`, 'green');
  console.log('');

  // Check token
  if (!token) {
    log('❌ No token provided', 'red');
    console.log('');
    log('Usage:', 'yellow');
    log('  node scripts/test-privy-token.js <PRIVY_ACCESS_TOKEN>', 'yellow');
    log('  or', 'yellow');
    log('  PRIVY_TOKEN="your-token" node scripts/test-privy-token.js', 'yellow');
    console.log('');
    process.exit(1);
  }

  log('📝 Token received:', 'blue');
  log(`   ${token.substring(0, 50)}...`, 'cyan');
  console.log('');

  // Initialize Privy client
  separator();
  log('🔧 Initializing Privy Client...', 'blue');
  separator();
  console.log('');

  let privyClient;
  try {
    privyClient = new PrivyClient(appId, appSecret);
    log('✅ Privy client initialized successfully', 'green');
  } catch (error) {
    log('❌ Failed to initialize Privy client', 'red');
    log(`   Error: ${error.message}`, 'red');
    process.exit(1);
  }

  console.log('');
  separator();
  log('🔍 Verifying Token...', 'blue');
  separator();
  console.log('');

  // Verify token
  try {
    const startTime = Date.now();
    const verifiedClaims = await privyClient.verifyAuthToken(token);
    const duration = Date.now() - startTime;

    log('✅ Token Verification Successful!', 'green');
    console.log('');
    log(`⏱️  Verification took: ${duration}ms`, 'cyan');
    console.log('');

    separator();
    log('📊 Verified Claims:', 'blue');
    separator();
    console.log('');
    console.log(JSON.stringify(verifiedClaims, null, 2));
    console.log('');

    separator();
    log('🎯 Key Information:', 'blue');
    separator();
    console.log('');
    log(`User ID (Privy DID): ${verifiedClaims.userId}`, 'cyan');
    log(`App ID: ${verifiedClaims.appId}`, 'cyan');
    
    if (verifiedClaims.issuer) {
      log(`Issuer: ${verifiedClaims.issuer}`, 'cyan');
    }
    
    if (verifiedClaims.issuedAt) {
      log(`Issued At: ${new Date(verifiedClaims.issuedAt * 1000).toISOString()}`, 'cyan');
    }
    
    if (verifiedClaims.expiration) {
      const expiresAt = new Date(verifiedClaims.expiration * 1000);
      const now = new Date();
      const isExpired = expiresAt < now;
      
      log(`Expires At: ${expiresAt.toISOString()}`, 'cyan');
      log(`Status: ${isExpired ? '⚠️  EXPIRED' : '✅ Valid'}`, isExpired ? 'yellow' : 'green');
      
      if (!isExpired) {
        const timeLeft = Math.floor((expiresAt - now) / 1000);
        log(`Time Left: ${timeLeft} seconds (${Math.floor(timeLeft / 60)} minutes)`, 'cyan');
      }
    }

    console.log('');
    separator();
    log('✨ Test Completed Successfully!', 'green');
    separator();
    console.log('');

  } catch (error) {
    log('❌ Token Verification Failed', 'red');
    console.log('');
    
    separator();
    log('📋 Error Details:', 'yellow');
    separator();
    console.log('');
    
    log(`Error Type: ${error.constructor.name}`, 'yellow');
    log(`Error Message: ${error.message}`, 'yellow');
    
    if (error.response) {
      log(`Response Status: ${error.response.status}`, 'yellow');
      log(`Response Data:`, 'yellow');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    
    console.log('');
    separator();
    log('💡 Common Issues:', 'blue');
    separator();
    console.log('');
    log('1. Token has expired - Get a fresh token from frontend', 'yellow');
    log('2. Invalid PRIVY_APP_ID or PRIVY_APP_SECRET', 'yellow');
    log('3. Token was issued for a different Privy app', 'yellow');
    log('4. Network connectivity issues', 'yellow');
    console.log('');

    process.exit(1);
  }
}

// Main execution
async function main() {
  // Get token from command line argument or environment variable
  const token = process.argv[2] || process.env.PRIVY_TOKEN;

  if (!token) {
    console.log('');
    log('🔐 Privy Token Verification Test', 'cyan');
    console.log('');
    log('❌ No token provided', 'red');
    console.log('');
    log('Usage:', 'yellow');
    log('  node scripts/test-privy-token.js <PRIVY_ACCESS_TOKEN>', 'yellow');
    log('  or', 'yellow');
    log('  PRIVY_TOKEN="your-token" node scripts/test-privy-token.js', 'yellow');
    console.log('');
    log('Example:', 'blue');
    log('  node scripts/test-privy-token.js eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...', 'cyan');
    console.log('');
    process.exit(1);
  }

  await testPrivyToken(token);
}

// Run the script
main().catch((error) => {
  console.error('');
  log('❌ Unexpected Error:', 'red');
  console.error(error);
  console.error('');
  process.exit(1);
});

