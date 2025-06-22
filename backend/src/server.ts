import httpServer from './app';
import { validateEnv } from './config';
import { logInfo, logError } from './utils/logger';
import { realTimeDataAggregator } from './services/realTimeDataAggregator';

// Validate environment variables
validateEnv();

const PORT = process.env.PORT || 5001;

// Start the server
httpServer.listen(PORT, () => {
  logInfo(`🚀 Server running on port ${PORT}`);
  logInfo(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logInfo(`🔗 API URL: http://localhost:${PORT}/api`);
  logInfo(`🌐 WebSocket URL: http://localhost:${PORT}`);

  // Start real-time data aggregation
  logInfo('🔄 Starting real-time data aggregation...');
  realTimeDataAggregator.startAggregation();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logInfo('SIGTERM received, shutting down gracefully');
  realTimeDataAggregator.stopAggregation();
  httpServer.close(() => {
    logInfo('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logInfo('SIGINT received, shutting down gracefully');
  realTimeDataAggregator.stopAggregation();
  httpServer.close(() => {
    logInfo('Process terminated');
    process.exit(0);
  });
});
