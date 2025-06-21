/**
 * Generate a secure random string for JWT secret
 * Usage: node scripts/generate-secret.js
 */

const crypto = require('crypto');

function generateSecureToken(length = 64) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

// Generate a secure JWT secret
const jwtSecret = generateSecureToken(64);

console.log('🔒 Generated secure JWT secret:');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('\n⚠️  IMPORTANT: Add this to your .env file and keep it secure!');
console.log('   Never commit this secret to version control.\n');

// For testing
if (require.main === module) {
  // Script was run directly
  module.exports = { generateSecureToken };
}
