const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const geocodingService = require('../services/geocoding.service');

// Helper function to get services from request
const getServices = (req) => ({
  db: req.services.db,
  supabase: req.services.supabase,
  io: req.services.io,
  cache: req.services.cache
});

// Helper function to handle errors
const handleError = (res, error, status = 500) => {
  console.error(error);
  res.status(status).json({ 
    error: error.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

// Create a new disaster
router.post('/', [
  check('title').notEmpty().withMessage('Title is required'),
  check('location_name').notEmpty().withMessage('Location name is required'),
  check('description').optional(),
  check('tags').optional().isArray().withMessage('Tags must be an array'),
  check('owner_id').notEmpty().withMessage('Owner ID is required')
], async (req, res) => {
  const { db, io } = getServices(req);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, location_name, description, tags = [], owner_id } = req.body;
    
    // Geocode the location
    let coordinates = null;
    try {
      const geoResult = await geocodingService.geocode(location_name);
      if (geoResult) {
        coordinates = geoResult;
      }
    } catch (geoError) {
      console.error('Geocoding error:', geoError);
      // Continue without coordinates if geocoding fails
    }

    const disasterData = {
      title,
      location_name,
      description,
      tags,
      owner_id,
      audit_trail: [{
        action: 'create',
        user_id: owner_id,
        timestamp: new Date().toISOString()
      }]
    };

    // Add coordinates if available
    if (coordinates) {
      disasterData.location = {
        type: 'Point',
        coordinates: [coordinates.lng, coordinates.lat],
        crs: { type: 'name', properties: { name: 'EPSG:4326' } }
      };
    }

    const disaster = await db.createDisaster(disasterData);
    
    // Emit WebSocket event
    io.emit('disaster_created', disaster);
    
    res.status(201).json(disaster);
    
  } catch (error) {
    handleError(res, error);
  }
});

// Get all disasters with optional filtering
router.get('/', async (req, res) => {
  const { db } = getServices(req);
  try {
    const { tag, owner_id } = req.query;
    const filters = {};
    
    if (tag) filters.tag = tag;
    if (owner_id) filters.owner_id = owner_id;
    
    const disasters = await db.getDisasters(filters);
    res.json(disasters);
    
  } catch (error) {
    handleError(res, error);
  }
});

// Get a single disaster by ID
router.get('/:id', async (req, res) => {
  const { db } = getServices(req);
  try {
    const disaster = await db.getDisasterById(req.params.id);
    
    if (!disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    
    res.json(disaster);
    
  } catch (error) {
    handleError(res, error);
  }
});

// Update a disaster
router.put('/:id', [
  check('title').optional(),
  check('location_name').optional(),
  check('description').optional(),
  check('tags').optional().isArray(),
  check('user_id').notEmpty().withMessage('User ID is required for audit trail')
], async (req, res) => {
  const { db, io } = getServices(req);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { user_id, ...updates } = req.body;
    
    // Get the current disaster to compare changes
    const currentDisaster = await db.getDisasterById(id);
    if (!currentDisaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    
    // Check if location_name was updated and needs geocoding
    if (updates.location_name && updates.location_name !== currentDisaster.location_name) {
      try {
        const geoResult = await geocodingService.geocode(updates.location_name);
        if (geoResult) {
          updates.location = {
            type: 'Point',
            coordinates: [geoResult.lng, geoResult.lat],
            crs: { type: 'name', properties: { name: 'EPSG:4326' } }
          };
        }
      } catch (geoError) {
        console.error('Geocoding error during update:', geoError);
        // Continue without updating coordinates if geocoding fails
      }
    }
    
    // Prepare audit trail
    const auditEntry = {
      action: 'update',
      user_id,
      timestamp: new Date().toISOString(),
      changes: Object.keys(updates).reduce((acc, key) => {
        if (key !== 'audit_trail') {
          acc[key] = {
            from: currentDisaster[key],
            to: updates[key]
          };
        }
        return acc;
      }, {})
    };
    
    // Add to existing audit trail
    updates.audit_trail = [
      ...(currentDisaster.audit_trail || []),
      auditEntry
    ];
    
    const updatedDisaster = await db.updateDisaster(id, updates);
    
    // Emit WebSocket event
    io.emit('disaster_updated', updatedDisaster);
    
    res.json(updatedDisaster);
    
  } catch (error) {
    handleError(res, error);
  }
});

// Delete a disaster
router.delete('/:id', async (req, res) => {
  const { db, io } = getServices(req);
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required for audit trail' });
    }
    
    const disaster = await db.getDisasterById(id);
    if (!disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    
    // In a real app, you might want to soft delete or add an audit entry
    await db.deleteDisaster(id);
    
    // Emit WebSocket event
    io.emit('disaster_deleted', { id, deleted_at: new Date().toISOString() });
    
    res.status(204).send();
    
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;
