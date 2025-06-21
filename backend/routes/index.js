const express = require('express');
const router = express.Router();

// Import route modules
const disasterRoutes = require('./disaster.routes');
const socialRoutes = require('./social.routes');
const resourceRoutes = require('./resource.routes');
const updateRoutes = require('./update.routes');
const verifyRoutes = require('./verify.routes');
const geocodeRoutes = require('./geocode.routes');

// Mount routes
router.use('/disasters', disasterRoutes);
router.use('/social-media', socialRoutes);
router.use('/resources', resourceRoutes);
router.use('/official-updates', updateRoutes);
router.use('/verify', verifyRoutes);
router.use('/geocode', geocodeRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
