const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const geocodingService = require('../services/geocoding.service');
const geminiService = require('../services/gemini.service');
const db = require('../services/db.service');

// Geocode a location name to coordinates
router.get('/location', [
  check('q').notEmpty().withMessage('Location query is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q: locationQuery } = req.query;
    
    // Try to geocode the location
    const result = await geocodingService.geocode(locationQuery);
    
    if (!result) {
      return res.status(404).json({ 
        error: 'Could not geocode the provided location',
        location: locationQuery
      });
    }
    
    res.json({
      query: locationQuery,
      location: result.location_name || locationQuery,
      coordinates: {
        lat: result.lat,
        lng: result.lng
      },
      source: result.source
    });
    
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ 
      error: 'Failed to geocode location',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Extract and geocode location from text using Gemini
router.post('/extract-location', [
  check('text').notEmpty().withMessage('Text is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text } = req.body;
    
    // Extract location using Gemini
    const locationName = await geminiService.extractLocationFromText(text);
    
    if (!locationName) {
      return res.status(404).json({ 
        error: 'Could not extract a location from the provided text',
        text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      });
    }
    
    // Geocode the extracted location
    const coordinates = await geocodingService.geocode(locationName);
    
    if (!coordinates) {
      return res.json({
        extracted_location: locationName,
        coordinates: null,
        message: 'Location was extracted but could not be geocoded'
      });
    }
    
    res.json({
      extracted_text: text,
      extracted_location: locationName,
      coordinates: {
        lat: coordinates.lat,
        lng: coordinates.lng
      },
      source: coordinates.source
    });
    
  } catch (error) {
    console.error('Location extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract and geocode location',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reverse geocode coordinates to a location name
router.get('/reverse', [
  check('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  check('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { lat, lng } = req.query;
    
    // Try to reverse geocode the coordinates
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`;
    const params = {
      access_token: process.env.MAPBOX_ACCESS_TOKEN || '',
      types: 'place,locality,neighborhood,address'
    };
    
    const response = await axios.get(url, { params });
    
    if (!response.data?.features?.length) {
      return res.status(404).json({ 
        error: 'Could not reverse geocode the provided coordinates',
        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) }
      });
    }
    
    const feature = response.data.features[0];
    
    res.json({
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      location_name: feature.place_name,
      feature_type: feature.place_type[0],
      context: feature.context?.map(ctx => ctx.text).join(', '),
      source: 'mapbox'
    });
    
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    
    // Fallback to a simpler approach if Mapbox fails
    try {
      const { lat, lng } = req.query;
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'DisasterResponsePlatform/1.0 (your-email@example.com)'
        }
      });
      
      if (response.data?.display_name) {
        return res.json({
          coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
          location_name: response.data.display_name,
          feature_type: Object.keys(response.data.address || {}).join(', '),
          source: 'openstreetmap'
        });
      }
      
      throw new Error('No location data found');
      
    } catch (fallbackError) {
      console.error('Fallback reverse geocoding also failed:', fallbackError);
      res.status(500).json({ 
        error: 'Failed to reverse geocode coordinates',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// Find disasters near a location
router.get('/nearby-disasters', [
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
    
    // Find disasters within the specified radius (in meters)
    const { data: disasters, error } = await db.supabase.rpc('find_nearby_disasters', {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius_meters: parseInt(radius, 10)
    });
    
    if (error) throw error;
    
    res.json(disasters || []);
    
  } catch (error) {
    console.error('Error finding nearby disasters:', error);
    res.status(500).json({ 
      error: 'Failed to find nearby disasters',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
