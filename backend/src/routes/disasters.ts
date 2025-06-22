import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { 
  getDisasters, 
  getDisasterById, 
  createDisaster, 
  updateDisaster, 
  deleteDisaster,
  getDisasterResources,
  addResource,
  verifyImage
} from '../controllers/disasters';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Validation rules
const disasterValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters long'),
  body('location_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location name must be between 2 and 100 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('status')
    .optional()
    .isIn(['reported', 'verified', 'in_progress', 'resolved', 'false_alarm'])
    .withMessage('Invalid status value'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity value')
];

const resourceValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Description must be at least 5 characters long'),
  body('location_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location name must be between 2 and 100 characters'),
  body('type')
    .isIn(['food', 'water', 'shelter', 'medical', 'clothing', 'other'])
    .withMessage('Invalid resource type'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('contact_info')
    .optional()
    .isString()
    .withMessage('Contact info must be a string')
];

// Public routes
router.get('/', [
  query('status').optional().isString(),
  query('severity').optional().isString(),
  query('tag').optional().isString(),
  validate()
], getDisasters);

router.get('/:id', [
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  validate()
], getDisasterById);

// Allow disaster creation without authentication for demo purposes
router.post('/', validate(disasterValidation), createDisaster);

// Protected routes (require authentication)
router.use(authenticateToken);

// Disaster CRUD operations (update/delete require auth)

router.put('/:id', [
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  ...disasterValidation,
  validate()
], updateDisaster);

router.delete('/:id', [
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  validate()
], deleteDisaster);

// Disaster resources
router.get('/:id/resources', [
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  validate()
], getDisasterResources);

router.post('/:id/resources', [
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  ...resourceValidation,
  validate()
], addResource);

// Image verification
router.post('/:id/verify-image', [
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  body('imageUrl').isURL().withMessage('Valid image URL is required'),
  validate()
], verifyImage);

// Admin-only routes
router.use(authorizeRoles('admin'));

// Additional admin routes can be added here

export default router;
