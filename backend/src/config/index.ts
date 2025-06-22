import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
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
  
  // Mapbox configuration
  mapbox: {
    accessToken: process.env.MAPBOX_ACCESS_TOKEN!,
  },
  
  // Google Gemini configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
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
  
  // API configuration
  api: {
    prefix: '/api',
    version: 'v1',
  },
};
