#!/usr/bin/env node

/**
 * JWT Secret Generator
 * 
 * Generates cryptographically secure random secrets for JWT tokens.
 * Use these secrets in your .env file for JWT_SECRET and JWT_REFRESH_SECRET.
 */

const crypto = require('crypto');

/**
 * Generate a cryptographically secure random string
 * @param {number} length - Number of bytes (default: 32)
 * @param {string} encoding - Output encoding (default: 'base64')
 * @returns {string} Random string
 */
function generateSecret(length = 32, encoding = 'base64') {
  return crypto.randomBytes(length).toString(encoding);
}

/**
 * Display separator line
 */
function separator() {
  console.log('='.repeat(70));
}

/**
 * Main function
 */
function main() {
  console.log('\n🔐 JWT Secret Generator\n');
  separator();
  
  // Generate secrets
  const jwtSecret = generateSecret(32, 'base64');
  const jwtRefreshSecret = generateSecret(32, 'base64');
  const jwtSecretHex = generateSecret(32, 'hex');
  const jwtRefreshSecretHex = generateSecret(32, 'hex');
  
  console.log('\n✅ Base64 Encoded Secrets (Recommended)\n');
  console.log('Copy these to your .env file:\n');
  console.log(`JWT_SECRET=${jwtSecret}`);
  console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);
  
  console.log('\n');
  separator();
  console.log('\n✅ Hex Encoded Secrets (Alternative)\n');
  console.log('Or use these if you prefer hex encoding:\n');
  console.log(`JWT_SECRET=${jwtSecretHex}`);
  console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecretHex}`);
  
  console.log('\n');
  separator();
  console.log('\n📋 Complete .env Configuration\n');
  console.log('Add these lines to your .env file:\n');
  console.log(`# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
`);
  
  console.log('');
  separator();
  console.log('\n💡 Tips:\n');
  console.log('• Keep these secrets private and never commit them to git');
  console.log('• Use different secrets for development and production');
  console.log('• Store production secrets in environment variables or secret managers');
  console.log('• Each secret is 32 bytes (256 bits) - cryptographically secure');
  console.log('• JWT_SECRET is for access tokens (short-lived)');
  console.log('• JWT_REFRESH_SECRET is for refresh tokens (long-lived)');
  console.log('\n');
  separator();
  console.log('\n✨ Secrets generated successfully!\n');
}

// Run the script
main();

