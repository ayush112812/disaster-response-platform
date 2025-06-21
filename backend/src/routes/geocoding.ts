import { Router } from 'express';
import { body } from 'express-validator';
import { geocodeLocation } from '../services/geocoding';
import { extractLocation } from '../services/gemini';
import { validate } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Geocoding endpoint
router.post('/geocode', [
  authenticateToken,
  body('locationName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Location name must be at least 2 characters'),
  validate()
], async (req, res) => {
  try {
    const { locationName } = req.body;
    
    const coordinates = await geocodeLocation(locationName);
    
    if (!coordinates) {
      return res.status(404).json({ 
        error: 'Could not geocode the provided location' 
      });
    }
    
    res.json({
      locationName,
      coordinates
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Failed to geocode location' });
  }
});

// Extract location from text using Gemini
router.post('/extract-location', [
  authenticateToken,
  body('text')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Text must be at least 5 characters'),
  validate()
], async (req, res) => {
  try {
    const { text } = req.body;
    
    const extractedLocation = await extractLocation(text);
    
    if (!extractedLocation) {
      return res.status(404).json({ 
        error: 'No location found in the provided text' 
      });
    }
    
    // Also geocode the extracted location
    const coordinates = await geocodeLocation(extractedLocation);
    
    res.json({
      extractedLocation,
      coordinates
    });
  } catch (error) {
    console.error('Location extraction error:', error);
    res.status(500).json({ error: 'Failed to extract location' });
  }
});

export default router;
