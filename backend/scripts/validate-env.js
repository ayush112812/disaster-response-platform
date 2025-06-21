require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Validate required environment variables
 */
function validateEnv() {
  const requiredVars = [
    'NODE_ENV',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'SUPABASE_SERVICE_KEY',
    'GOOGLE_AI_KEY',
    'MAPBOX_ACCESS_TOKEN',
    'JWT_SECRET',
  ];

  const missingVars = [];
  const sensitiveVars = ['SUPABASE_SERVICE_KEY', 'JWT_SECRET', 'GOOGLE_AI_KEY', 'MAPBOX_ACCESS_TOKEN'];

  console.log('\n🔍 Validating environment variables...\n');

  // Check for required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
      console.error(`❌ Missing required environment variable: ${varName}`);
    } else if (sensitiveVars.includes(varName)) {
      console.log(`✅ ${varName} is set (value hidden for security)`);
    } else {
      console.log(`✅ ${varName}=${process.env[varName]}`);
    }
  });

  // Check for default JWT_SECRET in production
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'your_jwt_secret_key') {
    console.error('\n⚠️  WARNING: Using default JWT_SECRET in production is not secure!');
    console.error('   Please set a strong, random JWT_SECRET in your production environment.\n');
  }

  // Check for test environment variables
  if (process.env.NODE_ENV === 'test') {
    console.log('\n🧪 Running in test environment');
  }

  // Output results
  if (missingVars.length > 0) {
    console.error('\n❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please add them to your .env file or environment variables.\n');
    process.exit(1);
  }

  console.log('\n✅ All required environment variables are set!\n');
  return true;
}

// Export for testing purposes
if (require.main === module) {
  validateEnv();
}

module.exports = { validateEnv };
