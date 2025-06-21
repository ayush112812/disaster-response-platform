require('dotenv').config();

module.exports = {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },
  
  // Google AI (Gemini) configuration
  googleAI: {
    apiKey: process.env.GOOGLE_AI_KEY,
  },
  
  // Mapbox configuration
  mapbox: {
    accessToken: process.env.MAPBOX_ACCESS_TOKEN,
  },
  
  // Twitter API configuration (if available)
  twitter: {
    bearerToken: process.env.TWITTER_BEARER_TOKEN,
  },
  
  // Cache configuration (in seconds)
  cache: {
    ttl: 3600, // 1 hour
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
};
