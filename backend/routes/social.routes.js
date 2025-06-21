const express = require('express');
const router = express.Router();
const socialService = require('../services/social.service');
const db = require('../services/db.service');
const { io } = require('../server');

// Get social media posts for a disaster
router.get('/disaster/:disasterId', async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { limit = 20 } = req.query;
    
    // Get the disaster to extract keywords
    const disaster = await db.getDisasterById(disasterId);
    if (!disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    
    // Extract keywords from title, location, and tags
    const keywords = [
      disaster.title,
      disaster.location_name,
      ...(disaster.tags || [])
    ].filter(Boolean);
    
    // Get social media posts
    const posts = await socialService.getDisasterSocialMedia(
      disasterId,
      keywords,
      parseInt(limit, 10)
    );
    
    // Emit WebSocket event for new social media data
    if (posts && posts.length > 0) {
      io.emit('social_media_updated', { 
        disasterId, 
        count: posts.length,
        latestPost: posts[0]
      });
    }
    
    res.json(posts);
    
  } catch (error) {
    console.error('Error fetching social media posts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch social media posts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search social media for specific keywords
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const keywords = q.split(',').map(k => k.trim()).filter(Boolean);
    
    // Get social media posts
    const posts = await socialService.getDisasterSocialMedia(
      'search',
      keywords,
      parseInt(limit, 10)
    );
    
    res.json(posts);
    
  } catch (error) {
    console.error('Error searching social media:', error);
    res.status(500).json({ 
      error: 'Failed to search social media',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
