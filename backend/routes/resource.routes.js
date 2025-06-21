const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const db = require('../services/db.service');
const geocodingService = require('../services/geocoding.service');
const { io } = require('../server');

// Helper function to handle errors
const handleError = (res, error, status = 500) => {
  console.error(error);
  res.status(status).json({ 
    error: error.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

// Create a new resource
router.post('/', [
  check('disaster_id').notEmpty().withMessage('Disaster ID is required'),
  check('name').notEmpty().withMessage('Resource name is required'),
  check('location_name').notEmpty().withMessage('Location name is required'),
  check('type').notEmpty().withMessage('Resource type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { disaster_id, name, location_name, type, details } = req.body;
    
    // Verify the disaster exists
    const disaster = await db.getDisasterById(disaster_id);
    if (!disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    
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

    const resourceData = {
      disaster_id,
      name,
      location_name,
      type,
      details: details || {}
    };

    // Add coordinates if available
    if (coordinates) {
      resourceData.location = {
        type: 'Point',
        coordinates: [coordinates.lng, coordinates.lat],
        crs: { type: 'name', properties: { name: 'EPSG:4326' } }
      };
    }

    const resource = await db.createResource(resourceData);
    
    // Emit WebSocket event
    io.emit('resource_created', resource);
    
    res.status(201).json(resource);
    
  } catch (error) {
    handleError(res, error);
  }
});

// Get resources for a disaster
router.get('/disaster/:disasterId', async (req, res) => {
  try {
    const { disasterId } = req.params;
    
    // Verify the disaster exists
    const disaster = await db.getDisasterById(disasterId);
    if (!disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    
    // Get resources for this disaster
    const resources = await db.supabase
      .from('resources')
      .select('*')
      .eq('disaster_id', disasterId);
    
    if (resources.error) throw resources.error;
    
    res.json(resources.data || []);
    
  } catch (error) {
    handleError(res, error);
  }
});

// Find resources near a location
router.get('/nearby', [
  check('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  check('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  check('radius').optional().isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100 and 50000 meters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { lat, lng, radius = 10000 } = req.query; // Default 10km radius
    
    // Find resources within the specified radius (in meters)
    const { data: resources, error } = await db.supabase.rpc('find_nearby_resources', {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius_meters: parseInt(radius, 10)
    });
    
    if (error) throw error;
    
    res.json(resources || []);
    
  } catch (error) {
    handleError(res, error);
  }
});

// Find resources near a disaster
router.get('/near-disaster/:disasterId', async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { radius = 10000 } = req.query; // Default 10km radius
    
    // Get the disaster to get its location
    const disaster = await db.getDisasterById(disasterId);
    if (!disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    
    if (!disaster.location) {
      return res.status(400).json({ error: 'Disaster location not available' });
    }
    
    // Find resources near the disaster
    const resources = await db.findResourcesNearDisaster(
      disasterId,
      parseInt(radius, 10)
    );
    
    res.json(resources);
    
  } catch (error) {
    handleError(res, error);
  }
});

// Update a resource
router.put('/:id', [
  check('name').optional(),
  check('location_name').optional(),
  check('type').optional(),
  check('details').optional()
], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if location_name was provided and needs geocoding
    if (updates.location_name) {
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
    
    // Update the resource
    const { data: updatedResource, error } = await db.supabase
      .from('resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!updatedResource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    // Emit WebSocket event
    io.emit('resource_updated', updatedResource);
    
    res.json(updatedResource);
    
  } catch (error) {
    handleError(res, error);
  }
});

// Delete a resource
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete the resource
    const { error } = await db.supabase
      .from('resources')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Emit WebSocket event
    io.emit('resource_deleted', { id });
    
    res.status(204).send();
    
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;
