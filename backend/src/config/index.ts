import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET'
];

// Optional environment variables (for enhanced functionality)
const optionalEnvVars = [
  'MAPBOX_ACCESS_TOKEN',
  'GEMINI_API_KEY'
];

export function validateEnv() {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  // Log warnings for missing optional variables
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`Optional environment variable missing: ${envVar} - Some features may be limited`);
    }
  }
}

// Configuration object
export default {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // Mapbox configuration (optional)
  mapbox: {
    accessToken: process.env.MAPBOX_ACCESS_TOKEN || '',
  },
  
  // Google Gemini configuration (optional)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  
  // CORS configuration
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  
  // Database configuration (for PostGIS features)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'disaster_response',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  },

  // API configuration
  api: {
    prefix: '/api',
    version: 'v1',
  },
};
