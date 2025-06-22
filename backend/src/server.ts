import httpServer from './app';
import { validateEnv } from './config';
import { logInfo, logError } from './utils/logger';

// Validate environment variables
validateEnv();

const PORT = process.env.PORT || 5001;

// Start the server
httpServer.listen(PORT, () => {
  logInfo(`🚀 Server running on port ${PORT}`);
  logInfo(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logInfo(`🔗 API URL: http://localhost:${PORT}/api`);
  logInfo(`🌐 WebSocket URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logInfo('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logInfo('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logInfo('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    logInfo('Process terminated');
    process.exit(0);
  });
});
