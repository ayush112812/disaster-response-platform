import { Router } from 'express';
import authRoutes from './auth';
import disasterRoutes from './disasters';
import resourceRoutes from './resources';
import reportsRoutes from './reports';
import updateRoutes from './updates';
import geocodingRoutes from './geocoding';
import socialMediaRoutes from './socialMedia';
import officialUpdatesRoutes from './officialUpdates';
import realtimeRoutes from './realtime';
// import geospatialRoutes from './geospatial';

const router = Router();

// API root endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Disaster Response Coordination Platform API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/api/health',
      disasters: '/api/disasters',
      resources: '/api/resources',
      reports: '/api/reports',
      auth: '/api/auth',
      socialMedia: '/api/social-media',
      geocoding: '/api/geocoding',
      officialUpdates: '/api/official-updates'
    },
    documentation: 'https://github.com/yourusername/disaster-response-platform'
  });
});

// Mount all routes
router.use('/auth', authRoutes);
router.use('/disasters', disasterRoutes);
router.use('/resources', resourceRoutes);
router.use('/reports', reportsRoutes);
router.use('/updates', updateRoutes);
router.use('/geocoding', geocodingRoutes);
router.use('/social-media', socialMediaRoutes);
router.use('/official-updates', officialUpdatesRoutes);
router.use('/realtime', realtimeRoutes);
// router.use('/geospatial', geospatialRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      cache: 'active',
      websocket: 'running'
    }
  });
});

export default router;
