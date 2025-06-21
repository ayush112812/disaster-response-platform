import { Router } from 'express';
import { param, query } from 'express-validator';
import { 
  getSocialMediaUpdates, 
  getOfficialUpdates,
  refreshOfficialUpdates
} from '../controllers/updates';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Social media updates
router.get('/disasters/:id/social-media', [
  param('id').isUUID().withMessage('Invalid disaster ID'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a positive integer'),
  query('urgent').optional().isBoolean().withMessage('Urgent must be a boolean'),
  validate()
], getSocialMediaUpdates);

// Official updates
router.get('/disasters/:id/official-updates', [
  param('id').isUUID().withMessage('Invalid disaster ID'),
  validate()
], getOfficialUpdates);

// Admin-only: Force refresh official updates
router.post('/disasters/:id/refresh-updates', [
  param('id').isUUID().withMessage('Invalid disaster ID'),
  validate(),
  authenticateToken,
  authorizeRoles('admin')
], refreshOfficialUpdates);

export default router;
