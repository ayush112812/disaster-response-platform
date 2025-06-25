import { Router } from 'express';
import { param, query } from 'express-validator';
import { scrapeOfficialUpdates } from '../services/officialUpdates';
import { supabase } from '../services/supabase';
import { validate } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get official updates for a disaster
router.get('/disasters/:id/official-updates', [
  authenticateToken,
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  validate()
], async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get disaster details
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('title, location_name, tags')
      .eq('id', id)
      .single();
    
    if (disasterError || !disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    
    // Determine disaster type from tags or title
    const disasterType = disaster.tags?.[0] || 'disaster';
    const locationName = disaster.location_name || 'unknown location';
    
    const updates = await scrapeOfficialUpdates(disasterType, locationName);
    
    // Limit the results
    const limitedUpdates = updates.slice(0, limit);
    
    res.json({
      disasterId: id,
      updates: limitedUpdates,
      total: updates.length,
      disasterType,
      locationName
    });
  } catch (error) {
    console.error('Error fetching official updates:', error);
    res.status(500).json({ error: 'Failed to fetch official updates' });
  }
});

// Get official updates by disaster type and location
router.get('/official-updates', [
  authenticateToken,
  query('disasterType').optional().isString(),
  query('location').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 20 }),
  validate()
], async (req, res) => {
  try {
    const disasterType = req.query.disasterType as string || 'disaster';
    const location = req.query.location as string || 'general';
    const limit = parseInt(req.query.limit as string) || 10;
    
    const updates = await scrapeOfficialUpdates(disasterType, { location });
    
    // Limit the results
    const limitedUpdates = updates.slice(0, limit);
    
    res.json({
      updates: limitedUpdates,
      total: updates.length,
      disasterType,
      location
    });
  } catch (error) {
    console.error('Error fetching official updates:', error);
    res.status(500).json({ error: 'Failed to fetch official updates' });
  }
});

export default router;
