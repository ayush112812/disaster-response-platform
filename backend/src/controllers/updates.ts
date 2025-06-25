import { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { getSocialMediaPosts, getCachedSocialMedia } from '../services/socialMedia';
import { scrapeOfficialUpdates } from '../services/officialUpdates';
import { AuthenticatedRequest } from '../middleware/auth';

export const getSocialMediaUpdates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: disasterId } = req.params;
    const { limit = '10', offset = '0', urgent } = req.query;
    
    // Check cache first
    const cached = await getCachedSocialMedia(disasterId);
    if (cached) {
      res.json({
        ...cached,
        fromCache: true
      });
      return;
    }
    
    // If not in cache, fetch fresh data
    const posts = await getSocialMediaPosts(disasterId, {
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      isUrgent: urgent === 'true' ? true : undefined
    });
    
    res.json({
      ...posts,
      fromCache: false
    });
  } catch (error) {
    console.error('Error fetching social media updates:', error);
    res.status(500).json({ error: 'Failed to fetch social media updates' });
  }
};

export const getOfficialUpdates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: disasterId } = req.params;
    const cacheKey = `official_updates_${disasterId}`;
    
    // Check cache first
    const { data: cached } = await supabase
      .from('cache')
      .select('value')
      .eq('key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (cached) {
      res.json({
        ...cached,
        fromCache: true
      });
      return;
    }
    
    // If not in cache, scrape fresh data
    const updates = await scrapeOfficialUpdates(disasterId);
    
    // Cache for 1 hour
    await supabase
      .from('cache')
      .upsert({
        key: cacheKey,
        value: { data: updates },
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });
    
    res.json({
      data: updates,
      fromCache: false
    });
  } catch (error) {
    console.error('Error fetching official updates:', error);
    res.status(500).json({ error: 'Failed to fetch official updates' });
  }
};

// Endpoint to manually refresh official updates
export const refreshOfficialUpdates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: disasterId } = req.params;
    const cacheKey = `official_updates_${disasterId}`;
    
    // Force refresh by deleting cache
    await supabase
      .from('cache')
      .delete()
      .eq('key', cacheKey);
    
    // Fetch fresh data
    const updates = await scrapeOfficialUpdates(disasterId);
    
    // Update cache
    await supabase
      .from('cache')
      .upsert({
        key: cacheKey,
        value: { data: updates },
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });
    
    res.json({
      success: true,
      data: updates
    });
  } catch (error) {
    console.error('Error refreshing official updates:', error);
    res.status(500).json({ error: 'Failed to refresh official updates' });
  }
};
