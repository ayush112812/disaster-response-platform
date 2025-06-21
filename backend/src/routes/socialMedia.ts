import { Router } from 'express';
import { param, query } from 'express-validator';
import { getSocialMediaPosts } from '../services/socialMedia';
import { validate } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get social media posts for a disaster
router.get('/disasters/:id/social-media', [
  authenticateToken,
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  validate()
], async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const posts = await getSocialMediaPosts(id);
    
    // Limit the results
    const limitedPosts = posts.slice(0, limit);
    
    res.json({
      disasterId: id,
      posts: limitedPosts,
      total: posts.length,
      priorityCount: posts.filter(post => post.isPriority).length
    });
  } catch (error) {
    console.error('Error fetching social media posts:', error);
    res.status(500).json({ error: 'Failed to fetch social media posts' });
  }
});

// Mock social media endpoint for testing
router.get('/mock-social-media', [
  query('keywords').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate()
], async (req, res) => {
  try {
    const keywords = req.query.keywords as string || '';
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Mock data for testing
    const mockPosts = [
      {
        id: 'mock-1',
        text: `#floodrelief Need urgent help in downtown area. Water rising fast! ${keywords}`,
        username: 'emergency_user',
        platform: 'twitter',
        timestamp: new Date().toISOString(),
        location: 'Downtown',
        tags: ['floodrelief', 'emergency'],
        isPriority: true
      },
      {
        id: 'mock-2',
        text: `Offering shelter and food for flood victims. Can accommodate 5 people. ${keywords}`,
        username: 'helpful_citizen',
        platform: 'twitter',
        timestamp: new Date().toISOString(),
        location: 'Uptown',
        tags: ['floodrelief', 'help'],
        isPriority: false
      },
      {
        id: 'mock-3',
        text: `Road closures due to flooding on Main Street. Avoid the area! ${keywords}`,
        username: 'traffic_update',
        platform: 'twitter',
        timestamp: new Date().toISOString(),
        location: 'Main Street',
        tags: ['traffic', 'flooding'],
        isPriority: false
      }
    ];
    
    const filteredPosts = keywords 
      ? mockPosts.filter(post => 
          post.text.toLowerCase().includes(keywords.toLowerCase()) ||
          post.tags.some(tag => tag.toLowerCase().includes(keywords.toLowerCase()))
        )
      : mockPosts;
    
    const limitedPosts = filteredPosts.slice(0, limit);
    
    res.json({
      posts: limitedPosts,
      total: filteredPosts.length,
      priorityCount: limitedPosts.filter(post => post.isPriority).length,
      mock: true
    });
  } catch (error) {
    console.error('Error generating mock social media posts:', error);
    res.status(500).json({ error: 'Failed to generate mock social media posts' });
  }
});

export default router;
