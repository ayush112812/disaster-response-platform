import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import {
  createDisasterFromUserInput,
  processSocialMediaPost,
  ingestSocialMediaData,
  isDisasterRelated,
  extractDisasterType,
  determineSeverity
} from '../services/disasterIngestion';
import { extractLocationFromText } from '../services/gemini';
import { emitToAll } from '../websocket';
import { supabase } from '../services/supabase';

const router = Router();

/**
 * Submit disaster report via user input (form)
 */
router.post('/report', [
  // Remove authentication requirement for demo purposes
  body('text').isString().isLength({ min: 10 }).withMessage('Report text must be at least 10 characters'),
  body('location').optional().isString().withMessage('Location must be a string'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  body('images.*').optional().isURL().withMessage('Each image must be a valid URL'),
  validate()
], async (req, res) => {
  try {
    const { text, location, images } = req.body;
    const userId = 'demo_user'; // Use demo user for testing
    
    console.log('📝 Received disaster report from user:', userId);
    
    // Check if the report is disaster-related
    if (!isDisasterRelated(text)) {
      return res.status(400).json({
        error: 'Report does not appear to be disaster-related',
        suggestion: 'Please include disaster-related keywords like earthquake, flood, fire, etc.'
      });
    }
    
    const report = {
      text,
      location,
      images,
      source: 'user_input' as const,
      reportedBy: userId
    };
    
    const disasterId = await createDisasterFromUserInput(report, userId);
    
    res.status(201).json({
      success: true,
      disasterId,
      message: 'Disaster report submitted successfully',
      analysis: {
        type: extractDisasterType(text),
        severity: determineSeverity(text),
        isDisasterRelated: true
      }
    });
    
  } catch (error) {
    console.error('Error submitting disaster report:', error);
    res.status(500).json({
      error: 'Failed to submit disaster report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Process social media post for disaster content
 */
router.post('/social-media', [
  body('id').isString().withMessage('Post ID is required'),
  body('text').isString().isLength({ min: 1 }).withMessage('Post text is required'),
  body('username').isString().withMessage('Username is required'),
  body('platform').isIn(['twitter', 'bluesky', 'facebook', 'instagram']).withMessage('Invalid platform'),
  body('timestamp').isISO8601().withMessage('Valid timestamp is required'),
  body('location').optional().isString(),
  body('mediaUrls').optional().isArray(),
  body('hashtags').optional().isArray(),
  validate()
], async (req, res) => {
  try {
    const socialMediaPost = req.body;
    
    console.log('📱 Processing social media post:', socialMediaPost.id);
    
    const disasterId = await processSocialMediaPost(socialMediaPost);
    
    if (disasterId) {
      res.json({
        success: true,
        disasterId,
        message: 'Disaster created from social media post',
        analysis: {
          type: extractDisasterType(socialMediaPost.text),
          severity: determineSeverity(socialMediaPost.text),
          isDisasterRelated: true
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Post not disaster-related or failed to process',
        analysis: {
          isDisasterRelated: isDisasterRelated(socialMediaPost.text)
        }
      });
    }
    
  } catch (error) {
    console.error('Error processing social media post:', error);
    res.status(500).json({
      error: 'Failed to process social media post',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Trigger social media data ingestion (mock Twitter/Bluesky API)
 */
router.post('/ingest-social-media', [
  // Remove authentication requirement for demo purposes
  validate()
], async (req, res) => {
  try {
    console.log('🔄 Triggering social media data ingestion...');
    
    // Run ingestion in background
    ingestSocialMediaData().catch(error => {
      console.error('Background social media ingestion failed:', error);
    });
    
    res.json({
      success: true,
      message: 'Social media data ingestion started',
      note: 'This simulates fetching data from Twitter/Bluesky APIs and creating disasters from relevant posts'
    });
    
  } catch (error) {
    console.error('Error starting social media ingestion:', error);
    res.status(500).json({
      error: 'Failed to start social media ingestion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Analyze text for disaster content (utility endpoint)
 */
router.post('/analyze', [
  body('text').isString().isLength({ min: 1 }).withMessage('Text is required'),
  validate()
], async (req, res) => {
  try {
    const { text } = req.body;

    console.log('🔍 Analyzing text with Gemini API:', text);

    // Use Gemini API for location extraction
    const locationResult = await extractLocationFromText(text);

    // Use local functions for disaster analysis
    const analysis = {
      isDisasterRelated: isDisasterRelated(text),
      type: extractDisasterType(text),
      severity: determineSeverity(text),
      extractedLocation: locationResult.extractedLocation,
      coordinates: locationResult.coordinates
    };

    console.log('✅ Analysis complete:', analysis);

    res.json({
      success: true,
      text,
      analysis
    });

  } catch (error) {
    console.error('❌ Error analyzing text:', error);

    // Fallback to local analysis if Gemini fails
    const fallbackAnalysis = {
      isDisasterRelated: isDisasterRelated(req.body.text),
      type: extractDisasterType(req.body.text),
      severity: determineSeverity(req.body.text),
      extractedLocation: undefined,
      coordinates: undefined,
      note: 'Gemini API unavailable, using local analysis'
    };

    res.json({
      success: true,
      text: req.body.text,
      analysis: fallbackAnalysis
    });
  }
});

/**
 * Test Gemini API directly
 */
router.post('/test-gemini', [
  body('text').isString().isLength({ min: 1 }).withMessage('Text is required'),
  validate()
], async (req, res) => {
  try {
    const { text } = req.body;

    console.log('🧪 Testing Gemini API directly with:', text);

    // Test basic Gemini API first
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const config = require('../config').default;

    console.log('🧪 Gemini API Key exists:', !!config.gemini?.apiKey);
    console.log('🧪 Gemini API Key length:', config.gemini?.apiKey?.length || 0);

    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log('🧪 Gemini model created successfully');

    const prompt = `Extract the location from this text: "${text}". Return only the location name.`;

    console.log('🧪 Sending prompt to Gemini:', prompt);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const geminiResult = response.text().trim();

    console.log('🧪 Raw Gemini response:', geminiResult);

    // Also test our function
    const functionResult = await extractLocationFromText(text);

    console.log('🧪 Function result:', functionResult);

    res.json({
      success: true,
      input: text,
      geminiRaw: geminiResult,
      functionResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🧪 Gemini test error:', error);
    res.status(500).json({
      error: 'Gemini test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * Enhanced geocode endpoint - Extract location and integrate with disaster system
 * POST /geocode
 */
router.post('/geocode', [
  body('description').isString().isLength({ min: 1 }).withMessage('Description is required'),
  body('createDisaster').optional().isBoolean().withMessage('createDisaster must be boolean'),
  body('userId').optional().isString().withMessage('userId must be string'),
  validate()
], async (req, res) => {
  try {
    const { description, createDisaster = false, userId } = req.body;

    console.log('🌍 Enhanced geocoding request:', { description, createDisaster });

    // Use Gemini API to extract location from description
    const locationResult = await extractLocationFromText(description);

    if (!locationResult.extractedLocation) {
      return res.json({
        success: true,
        description,
        location_name: null,
        coordinates: null,
        message: "No location detected in the description"
      });
    }

    const response: any = {
      success: true,
      description,
      location_name: locationResult.extractedLocation,
      coordinates: locationResult.coordinates || null
    };

    // If coordinates are available, find nearby resources
    if (locationResult.coordinates) {
      try {
        const nearbyResources = await findNearbyResources(
          locationResult.coordinates.lat,
          locationResult.coordinates.lng,
          10000 // 10km radius
        );

        response.nearby_resources = nearbyResources;
        response.nearby_count = nearbyResources.length;

        console.log(`📍 Found ${nearbyResources.length} nearby resources`);
      } catch (error) {
        console.warn('Failed to find nearby resources:', error);
      }
    }

    // Optionally create a disaster record
    if (createDisaster && locationResult.coordinates && userId) {
      try {
        const disasterData = {
          title: `Reported incident: ${locationResult.extractedLocation}`,
          description,
          location_name: locationResult.extractedLocation,
          location: `POINT(${locationResult.coordinates.lng} ${locationResult.coordinates.lat})`,
          tags: ['user_report', 'geocoded'],
          owner_id: userId
        };

        const { data: disaster, error } = await supabase
          .from('disasters')
          .insert(disasterData)
          .select()
          .single();

        if (!error) {
          response.disaster_created = true;
          response.disaster_id = disaster.id;

          // Emit real-time update
          emitToAll('disaster_created', disaster);

          console.log('✅ Created disaster from geocoding:', disaster.id);
        }
      } catch (error) {
        console.warn('Failed to create disaster:', error);
      }
    }

    console.log('✅ Enhanced geocoding successful');
    res.json(response);

  } catch (error) {
    console.error('❌ Enhanced geocoding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to geocode description',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Helper function to find nearby resources
 */
async function findNearbyResources(lat: number, lng: number, radiusMeters: number) {
  try {
    // Try PostGIS query first
    const { data, error } = await supabase
      .rpc('find_nearby_resources', {
        target_lat: lat,
        target_lng: lng,
        radius_meters: radiusMeters
      });

    if (error) {
      console.warn('PostGIS query failed, using fallback:', error);
      // Fallback to basic query without geospatial filtering
      const { data: fallbackData } = await supabase
        .from('resources')
        .select('*')
        .limit(10);

      return fallbackData || [];
    }

    return data || [];
  } catch (error) {
    console.warn('Error in geospatial query:', error);
    return [];
  }
}

/**
 * Get ingestion statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // In a real implementation, this would query the database for statistics
    const mockStats = {
      totalReports: 156,
      userReports: 89,
      socialMediaReports: 67,
      verifiedDisasters: 34,
      pendingReports: 12,
      platforms: {
        twitter: 45,
        bluesky: 15,
        facebook: 5,
        instagram: 2
      },
      disasterTypes: {
        earthquake: 8,
        flood: 12,
        fire: 9,
        hurricane: 3,
        tornado: 2
      },
      lastIngestion: new Date().toISOString()
    };
    
    res.json({
      success: true,
      stats: mockStats
    });
    
  } catch (error) {
    console.error('Error getting ingestion stats:', error);
    res.status(500).json({
      error: 'Failed to get ingestion statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Manual disaster creation endpoint (for testing)
 */
router.post('/manual', [
  authenticateToken,
  body('title').isString().isLength({ min: 5 }).withMessage('Title must be at least 5 characters'),
  body('description').isString().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('location_name').isString().withMessage('Location name is required'),
  body('type').optional().isString(),
  body('severity').isIn(['low', 'medium', 'high']).withMessage('Severity must be low, medium, or high'),
  body('tags').optional().isArray(),
  validate()
], async (req, res) => {
  try {
    const { title, description, location_name, type, severity, tags } = req.body;
    const userId = req.user?.id || 'manual_user';
    
    const report = {
      text: `${title}. ${description}`,
      location: location_name,
      source: 'user_input' as const,
      reportedBy: userId
    };
    
    const disasterId = await createDisasterFromUserInput(report, userId);
    
    res.status(201).json({
      success: true,
      disasterId,
      message: 'Disaster created manually'
    });
    
  } catch (error) {
    console.error('Error creating manual disaster:', error);
    res.status(500).json({
      error: 'Failed to create disaster manually',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
