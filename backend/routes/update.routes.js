const express = require('express');
const router = express.Router();
const updatesService = require('../services/updates.service');
const db = require('../services/db.service');

// Get official updates for a disaster
router.get('/disaster/:disasterId', async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { limit = 10 } = req.query;
    
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
    
    // Get official updates
    const officialUpdates = await updatesService.getOfficialUpdates(
      keywords,
      parseInt(limit, 10)
    );
    
    res.json({
      disaster_id: disasterId,
      disaster_title: disaster.title,
      count: officialUpdates.length,
      updates: officialUpdates
    });
    
  } catch (error) {
    console.error('Error fetching official updates:', error);
    res.status(500).json({ 
      error: 'Failed to fetch official updates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search for official updates by keywords
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const keywords = q.split(',').map(k => k.trim()).filter(Boolean);
    
    // Get official updates
    const updates = await updatesService.getOfficialUpdates(
      keywords,
      parseInt(limit, 10)
    );
    
    res.json({
      query: q,
      count: updates.length,
      updates
    });
    
  } catch (error) {
    console.error('Error searching official updates:', error);
    res.status(500).json({ 
      error: 'Failed to search official updates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get updates from a specific source
router.get('/source/:source', async (req, res) => {
  try {
    const { source } = req.params;
    const { limit = 10 } = req.query;
    
    // Get official updates from the specified source
    const updates = await updatesService.getOfficialUpdates(
      [],
      parseInt(limit, 10)
    );
    
    // Filter by source (case-insensitive)
    const sourceUpdates = updates.filter(update => 
      update.source.toLowerCase() === source.toLowerCase()
    );
    
    res.json({
      source,
      count: sourceUpdates.length,
      updates: sourceUpdates
    });
    
  } catch (error) {
    console.error(`Error fetching updates from source ${req.params.source}:`, error);
    res.status(500).json({ 
      error: `Failed to fetch updates from source ${req.params.source}`,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
