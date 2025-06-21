import { Router } from 'express';
import { param, query } from 'express-validator';
import { 
  findNearbyDisasters, 
  findResourcesNearDisaster, 
  findResourcesNearPoint 
} from '../services/geospatial';
import { validate } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Find disasters near a point
router.get('/disasters/nearby', [
  authenticateToken,
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  query('radius').optional().isFloat({ min: 0.1, max: 100 }).withMessage('Radius must be between 0.1 and 100 km'),
  validate()
], async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 10;
    
    const disasters = await findNearbyDisasters({ latitude: lat, longitude: lng }, radius);
    
    res.json({
      point: { lat, lng },
      radius,
      disasters,
      count: disasters.length
    });
  } catch (error) {
    console.error('Error finding nearby disasters:', error);
    res.status(500).json({ error: 'Failed to find nearby disasters' });
  }
});

// Find resources near a disaster
router.get('/disasters/:id/resources', [
  authenticateToken,
  param('id').isUUID().withMessage('Invalid disaster ID'),
  query('radius').optional().isFloat({ min: 0.1, max: 100 }).withMessage('Radius must be between 0.1 and 100 km'),
  validate()
], async (req, res) => {
  try {
    const { id } = req.params;
    const radius = parseFloat(req.query.radius as string) || 10;
    
    const resources = await findResourcesNearDisaster(id, radius);
    
    res.json({
      disasterId: id,
      radius,
      resources,
      count: resources.length
    });
  } catch (error) {
    console.error('Error finding resources near disaster:', error);
    res.status(500).json({ error: 'Failed to find resources near disaster' });
  }
});

// Find resources near a point
router.get('/resources/nearby', [
  authenticateToken,
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  query('radius').optional().isFloat({ min: 0.1, max: 100 }).withMessage('Radius must be between 0.1 and 100 km'),
  query('type').optional().isString().withMessage('Resource type must be a string'),
  validate()
], async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 10;
    const resourceType = req.query.type as string;
    
    let resources = await findResourcesNearPoint({ latitude: lat, longitude: lng }, radius);
    
    // Filter by resource type if specified
    if (resourceType) {
      resources = resources.filter(resource => resource.type === resourceType);
    }
    
    res.json({
      point: { lat, lng },
      radius,
      resourceType: resourceType || 'all',
      resources,
      count: resources.length
    });
  } catch (error) {
    console.error('Error finding nearby resources:', error);
    res.status(500).json({ error: 'Failed to find nearby resources' });
  }
});

export default router;
