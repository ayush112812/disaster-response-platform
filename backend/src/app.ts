import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server as HttpServer } from 'http';

import { initializeWebsocket } from './websocket';
import routes from './routes';
import { errorHandler } from './middleware/error';
import { validate } from './middleware/validation';
import config from './config';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { realTimeDataAggregator } from './services/realTimeDataAggregator';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = new HttpServer(app);

// Initialize WebSocket server
const io = initializeWebsocket(httpServer);

// Initialize real-time data aggregator
console.log('🔄 Initializing real-time data aggregator...');
realTimeDataAggregator.startAggregation();

// Middleware
app.use(helmet());
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://disaster-response-platform.vercel.app',
      'https://disaster-response-platform-sqaj.vercel.app',
      'https://disaster-response-platform-8t9k.vercel.app',
      'https://disaster-response-platform-7qlu.vercel.app',
      'https://disaster-response-platform-swart.vercel.app',
      process.env.ALLOWED_ORIGINS?.split(',') || []
    ].flat()
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user'],
  credentials: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Add io to response locals for use in routes
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.io = io;
  next();
});

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

// API routes
app.use(config.api.prefix, routes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    status: 'error',
    message: 'Not Found',
    path: req.path
  });
});

// Error handling
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  httpServer.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  // Close server & exit process
  httpServer.close(() => process.exit(1));
});

export default httpServer;




