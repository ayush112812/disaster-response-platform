import { Router } from 'express';
import { param, query, body } from 'express-validator';
import {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource
} from '../controllers/resources';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { getComprehensiveResources, fetchNearbyHospitals, fetchEmergencyServices } from '../services/externalResources';

const router = Router();

// Public routes
router.get('/', [
  query('disasterId').optional().isUUID().withMessage('Invalid disaster ID'),
  query('type').optional().isString(),
  query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  query('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  query('radius').optional().isInt({ min: 100, max: 100000 }).withMessage('Radius must be between 100 and 100000 meters'),
  validate()
], getResources);

router.get('/:id', [
  param('id').isUUID().withMessage('Invalid resource ID'),
  validate()
], getResourceById);

// Geospatial route for disaster resources
router.get('/disasters/:id/resources', [
  param('id').isUUID().withMessage('Invalid disaster ID'),
  query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  query('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  query('radius').optional().isInt({ min: 100, max: 100000 }).withMessage('Radius must be between 100 and 100000 meters'),
  query('type').optional().isString().withMessage('Resource type must be a string'),
  validate()
], async (req, res) => {
  try {
    const { id } = req.params;
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseInt(req.query.radius as string) || 10000; // Default 10km
    const resourceType = req.query.type as string;

    // Mock geospatial data for now since database might not be available
    const mockResources = [
      {
        id: '1',
        disaster_id: id,
        name: 'Emergency Shelter - Community Center',
        description: 'Temporary shelter with capacity for 200 people. Food and medical assistance available.',
        location_name: 'Lower East Side, NYC',
        type: 'shelter',
        quantity: 200,
        contact_info: { phone: '555-0123', email: 'shelter@community.org' },
        created_by: 'reliefAdmin',
        distance: 2.5 // km from query point
      },
      {
        id: '2',
        disaster_id: id,
        name: 'Medical Supply Distribution',
        description: 'First aid supplies and medications available for flood victims.',
        location_name: 'Midtown Manhattan, NYC',
        type: 'medical',
        quantity: 500,
        contact_info: { phone: '555-0456', email: 'medical@redcross.org' },
        created_by: 'medicalTeam',
        distance: 5.2 // km from query point
      },
      {
        id: '3',
        disaster_id: id,
        name: 'Food Distribution Center',
        description: 'Hot meals and emergency food supplies for displaced families.',
        location_name: 'Brooklyn Heights, NYC',
        type: 'food',
        quantity: 1000,
        contact_info: { phone: '555-0789', email: 'food@salvation.org' },
        created_by: 'foodBank',
        distance: 8.1 // km from query point
      }
    ];

    // Filter by type if specified
    let filteredResources = mockResources;
    if (resourceType) {
      filteredResources = mockResources.filter(resource => resource.type === resourceType);
    }

    // Filter by radius (convert km to meters for comparison)
    filteredResources = filteredResources.filter(resource => resource.distance * 1000 <= radius);

    res.json({
      disaster_id: id,
      query_point: lat && lng ? { lat, lng } : null,
      radius_meters: radius,
      resource_type: resourceType || 'all',
      resources: filteredResources,
      count: filteredResources.length
    });
  } catch (error) {
    console.error('Error fetching disaster resources:', error);
    res.status(500).json({ error: 'Failed to fetch disaster resources' });
  }
});

// External resources from mapping services (hospitals, emergency services, etc.)
router.get('/external/comprehensive', [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  query('radius').optional().isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100 and 50000 meters'),
  validate()
], async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseInt(req.query.radius as string) || 10000; // Default 10km

    console.log(`🏥 Fetching comprehensive external resources near ${lat}, ${lng} within ${radius}m`);

    const resources = await getComprehensiveResources(lat, lng, radius);

    res.json({
      query_point: { lat, lng },
      radius_meters: radius,
      ...resources,
      message: `Found ${resources.total} external resources from mapping services`
    });
  } catch (error) {
    console.error('Error fetching external resources:', error);
    res.status(500).json({ error: 'Failed to fetch external resources' });
  }
});

// Fetch hospitals specifically
router.get('/external/hospitals', [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  query('radius').optional().isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100 and 50000 meters'),
  validate()
], async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseInt(req.query.radius as string) || 10000;

    console.log(`🏥 Fetching hospitals near ${lat}, ${lng} within ${radius}m`);

    const hospitals = await fetchNearbyHospitals(lat, lng, radius);

    res.json({
      query_point: { lat, lng },
      radius_meters: radius,
      hospitals,
      count: hospitals.length,
      message: `Found ${hospitals.length} hospitals from mapping services`
    });
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

// Fetch emergency services specifically
router.get('/external/emergency', [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  query('radius').optional().isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100 and 50000 meters'),
  validate()
], async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseInt(req.query.radius as string) || 10000;

    console.log(`🚓 Fetching emergency services near ${lat}, ${lng} within ${radius}m`);

    const services = await fetchEmergencyServices(lat, lng, radius);

    res.json({
      query_point: { lat, lng },
      radius_meters: radius,
      emergency_services: services,
      count: services.length,
      message: `Found ${services.length} emergency services from mapping services`
    });
  } catch (error) {
    console.error('Error fetching emergency services:', error);
    res.status(500).json({ error: 'Failed to fetch emergency services' });
  }
});

// Protected routes (require authentication)
router.use(authenticateToken);

router.post('/', [
  body('disaster_id').isUUID().withMessage('Valid disaster ID is required'),
  body('name').isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('description').isLength({ min: 5 }).withMessage('Description must be at least 5 characters'),
  body('location_name').optional().isString(),
  body('type').isIn(['food', 'water', 'shelter', 'medical', 'clothing', 'other']).withMessage('Invalid resource type'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('contact_info').optional().isString(),
  validate()
], createResource);

router.put('/:id', [
  param('id').isUUID().withMessage('Invalid resource ID'),
  body('name').optional().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('description').optional().isLength({ min: 5 }).withMessage('Description must be at least 5 characters'),
  body('location_name').optional().isString(),
  body('type').optional().isIn(['food', 'water', 'shelter', 'medical', 'clothing', 'other']).withMessage('Invalid resource type'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('contact_info').optional().isString(),
  validate()
], updateResource);

router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid resource ID'),
  validate()
], deleteResource);

export default router;
