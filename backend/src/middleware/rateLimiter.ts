import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limiting configuration
const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000 / 60) + ' minutes'
    });
  }
};

// General rate limiter for all routes
export const generalRateLimit = rateLimit(rateLimitConfig);

// Stricter rate limiter for external API routes
export const externalApiRateLimit = rateLimit({
  ...rateLimitConfig,
  windowMs: 60000, // 1 minute
  max: 10, // Limit to 10 requests per minute for external APIs
  message: {
    error: 'External API rate limit exceeded',
    message: 'Too many external API requests, please try again later',
    retryAfter: '1 minute'
  }
});

// Very strict rate limiter for authentication routes
export const authRateLimit = rateLimit({
  ...rateLimitConfig,
  windowMs: 900000, // 15 minutes
  max: 5, // Limit to 5 login attempts per 15 minutes
  message: {
    error: 'Authentication rate limit exceeded',
    message: 'Too many login attempts, please try again later',
    retryAfter: '15 minutes'
  }
});

export default generalRateLimit;
