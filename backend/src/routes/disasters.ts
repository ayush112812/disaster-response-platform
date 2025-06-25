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
import { supabase } from '../services/supabase';
import { emitDisasterUpdated, emitResourcesUpdated } from '../websocket';

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

// Disaster resources with geospatial queries
router.get('/:id/resources', [
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  query('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  query('radius').optional().isInt({ min: 1, max: 100000 }).withMessage('Radius must be 1-100000 meters'),
  query('type').optional().isIn(['shelter', 'hospital', 'food', 'water', 'medical', 'transport']).withMessage('Invalid resource type'),
  validate()
], async (req, res) => {
  try {
    const disasterId = req.params.id;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    const radius = parseInt(req.query.radius as string) || 10000; // Default 10km
    const resourceType = req.query.type as string;

    console.log('🔍 Finding resources for disaster:', { disasterId, lat, lng, radius, resourceType });

    // Get disaster details first
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', disasterId)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({
        success: false,
        error: 'Disaster not found'
      });
    }

    let resources = [];
    let coordinates = { lat, lng };

    if (lat && lng) {
      // Use provided coordinates for geospatial search
      try {
        resources = await findNearbyResourcesGeospatial(lat, lng, radius, resourceType);
      } catch (error) {
        console.error('Geospatial query failed:', error);
        return res.status(500).json({
          error: 'Geospatial query failed. Please ensure PostGIS is properly configured.',
          details: error.message
        });
      }
    } else if (disaster.latitude && disaster.longitude) {
      // Use disaster coordinates for geospatial search
      coordinates = { lat: disaster.latitude, lng: disaster.longitude };
      try {
        resources = await findNearbyResourcesGeospatial(disaster.latitude, disaster.longitude, radius, resourceType);
      } catch (error) {
        console.error('Geospatial query failed:', error);
        return res.status(500).json({
          error: 'Geospatial query failed. Please ensure PostGIS is properly configured.',
          details: error.message
        });
      }
    } else {
      return res.status(400).json({
        error: 'No coordinates available. Please provide lat/lng parameters or ensure disaster has coordinates.'
      });
    }

    res.json({
      success: true,
      disaster: {
        id: disaster.id,
        title: disaster.title,
        location_name: disaster.location_name
      },
      search_params: {
        coordinates,
        radius_meters: radius,
        resource_type: resourceType || 'all'
      },
      resources,
      count: resources.length
    });

  } catch (error) {
    console.error('❌ Error finding disaster resources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find disaster resources',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/:id/resources', [
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  ...resourceValidation,
  validate()
], addResource);

// Social media reports for disaster
router.get('/:id/social-media', [
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validate()
], async (req, res) => {
  try {
    const disasterId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 20;

    console.log('🐦 Fetching social media reports for disaster:', disasterId);

    // Get disaster details first
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', disasterId)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({
        success: false,
        error: 'Disaster not found'
      });
    }

    // Get social media posts related to this disaster
    const socialPosts = await getMockSocialMediaPosts(disaster, limit);

    res.json({
      success: true,
      disaster: {
        id: disaster.id,
        title: disaster.title,
        location_name: disaster.location_name
      },
      social_media_posts: socialPosts,
      count: socialPosts.length,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching social media reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch social media reports',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Official updates for disaster
router.get('/:id/official-updates', [
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  validate()
], async (req, res) => {
  try {
    const disasterId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 10;

    console.log('📰 Fetching official updates for disaster:', disasterId);

    // Get disaster details first
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', disasterId)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({
        success: false,
        error: 'Disaster not found'
      });
    }

    // Get official updates (with caching)
    const officialUpdates = await getOfficialUpdatesWithCache(disaster, limit);

    res.json({
      success: true,
      disaster: {
        id: disaster.id,
        title: disaster.title,
        location_name: disaster.location_name
      },
      official_updates: officialUpdates,
      count: officialUpdates.length,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching official updates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch official updates',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Image verification
router.post('/:id/verify-image', [
  param('id').isString().isLength({ min: 1 }).withMessage('Invalid disaster ID'),
  body('image_url').isURL().withMessage('Valid image URL is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  validate()
], async (req, res) => {
  try {
    const disasterId = req.params.id;
    const { image_url, description } = req.body;

    console.log('📸 Verifying image for disaster:', { disasterId, image_url });

    // Get disaster details first
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', disasterId)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({
        success: false,
        error: 'Disaster not found'
      });
    }

    // Use Gemini API for image verification
    const verificationResult = await verifyImageWithGemini(image_url, disaster, description);

    res.json({
      success: true,
      disaster: {
        id: disaster.id,
        title: disaster.title,
        location_name: disaster.location_name
      },
      image_url,
      verification: verificationResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error verifying image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin-only routes
router.use(authorizeRoles('admin'));

// Additional admin routes can be added here

/**
 * Helper function to find nearby resources using geospatial queries
 */
async function findNearbyResourcesGeospatial(lat: number, lng: number, radiusMeters: number, resourceType?: string) {
  try {
    console.log('🔍 Geospatial search:', { lat, lng, radiusMeters, resourceType });

    // Use PostGIS query (as specified in assignment)
    const { data, error } = await supabase
      .rpc('find_nearby_resources', {
        target_lat: lat,
        target_lng: lng,
        radius_meters: radiusMeters,
        resource_type: resourceType
      });

    if (error) {
      console.error('❌ PostGIS query failed:', error);
      throw new Error(`Geospatial query failed: ${error.message}`);
    }

    console.log(`✅ Found ${data?.length || 0} nearby resources using PostGIS`);
    return data || [];
  } catch (error) {
    console.error('❌ Error in geospatial query:', error);
    throw error; // Don't fall back to mock data - assignment requires real geospatial queries
  }
}

/**
 * Helper function to get mock coordinates from location name
 */
function getMockCoordinatesFromLocation(locationName: string): { lat: number; lng: number } | null {
  const locationMap: Record<string, { lat: number; lng: number }> = {
    'Lower East Side, NYC': { lat: 40.715955, lng: -73.986725 },
    'Manhattan, NYC': { lat: 40.7831, lng: -73.9712 },
    'San Francisco, CA': { lat: 37.779238, lng: -122.419359 },
    'Downtown Austin, TX': { lat: 30.268072, lng: -97.742805 },
    'Miami Beach, FL': { lat: 25.790654, lng: -80.130045 },
    'Napa Valley, CA': { lat: 38.5025, lng: -122.2654 },
    'Moore, OK': { lat: 35.3395, lng: -97.4864 }
  };

  // Try exact match first
  if (locationMap[locationName]) {
    return locationMap[locationName];
  }

  // Try partial matches
  for (const [key, coords] of Object.entries(locationMap)) {
    if (locationName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(locationName.toLowerCase())) {
      return coords;
    }
  }

  return null;
}

/**
 * Helper function to get mock nearby resources
 */
function getMockNearbyResources(lat: number, lng: number, resourceType?: string) {
  const allResources = [
    {
      id: '1',
      name: 'Emergency Shelter - Red Cross',
      type: 'shelter',
      location_name: 'Community Center',
      address: '123 Main St',
      contact: '(555) 123-4567',
      capacity: 200,
      availability: 'available',
      distance_meters: Math.floor(Math.random() * 5000) + 500,
      coordinates: { lat: lat + (Math.random() - 0.5) * 0.01, lng: lng + (Math.random() - 0.5) * 0.01 }
    },
    {
      id: '2',
      name: 'General Hospital',
      type: 'hospital',
      location_name: 'Downtown Medical Center',
      address: '456 Health Ave',
      contact: '(555) 987-6543',
      capacity: 150,
      availability: 'limited',
      distance_meters: Math.floor(Math.random() * 3000) + 800,
      coordinates: { lat: lat + (Math.random() - 0.5) * 0.01, lng: lng + (Math.random() - 0.5) * 0.01 }
    },
    {
      id: '3',
      name: 'Food Distribution Center',
      type: 'food',
      location_name: 'Local Church',
      address: '789 Faith Rd',
      contact: '(555) 456-7890',
      capacity: 500,
      availability: 'available',
      distance_meters: Math.floor(Math.random() * 2000) + 300,
      coordinates: { lat: lat + (Math.random() - 0.5) * 0.01, lng: lng + (Math.random() - 0.5) * 0.01 }
    },
    {
      id: '4',
      name: 'Water Distribution Point',
      type: 'water',
      location_name: 'Fire Station #3',
      address: '321 Rescue Blvd',
      contact: '(555) 321-0987',
      capacity: 1000,
      availability: 'available',
      distance_meters: Math.floor(Math.random() * 4000) + 600,
      coordinates: { lat: lat + (Math.random() - 0.5) * 0.01, lng: lng + (Math.random() - 0.5) * 0.01 }
    },
    {
      id: '5',
      name: 'Mobile Medical Unit',
      type: 'medical',
      location_name: 'Parking Lot A',
      address: '654 Emergency Way',
      contact: '(555) 654-3210',
      capacity: 50,
      availability: 'limited',
      distance_meters: Math.floor(Math.random() * 1500) + 200,
      coordinates: { lat: lat + (Math.random() - 0.5) * 0.01, lng: lng + (Math.random() - 0.5) * 0.01 }
    },
    {
      id: '6',
      name: 'Emergency Transport Hub',
      type: 'transport',
      location_name: 'Bus Terminal',
      address: '987 Transit St',
      contact: '(555) 789-0123',
      capacity: 300,
      availability: 'available',
      distance_meters: Math.floor(Math.random() * 3500) + 700,
      coordinates: { lat: lat + (Math.random() - 0.5) * 0.01, lng: lng + (Math.random() - 0.5) * 0.01 }
    }
  ];

  let filteredResources = allResources;

  if (resourceType) {
    filteredResources = allResources.filter(resource => resource.type === resourceType);
  }

  // Sort by distance
  return filteredResources.sort((a, b) => a.distance_meters - b.distance_meters);
}

/**
 * Helper function to get general resources when no geospatial data is available
 */
async function getGeneralResources(resourceType?: string) {
  try {
    let query = supabase.from('resources').select('*');

    if (resourceType) {
      query = query.eq('type', resourceType);
    }

    const { data, error } = await query.limit(10);

    if (error) {
      console.warn('Database query failed, using mock data:', error);
      return getMockNearbyResources(40.7128, -74.0060, resourceType); // Default NYC coordinates
    }

    return data || [];
  } catch (error) {
    console.warn('Error getting general resources:', error);
    return getMockNearbyResources(40.7128, -74.0060, resourceType); // Default NYC coordinates
  }
}

/**
 * Helper function to get mock social media posts
 */
async function getMockSocialMediaPosts(disaster: any, limit: number) {
  const disasterKeywords = extractKeywordsFromDisaster(disaster);
  const location = disaster.location_name || 'unknown location';

  const mockPosts = [
    {
      id: `twitter_${Date.now()}_1`,
      platform: 'twitter',
      username: 'EmergencyAlert_NYC',
      user_display_name: 'NYC Emergency Alerts',
      post: `🚨 URGENT: ${disasterKeywords[0]} reported in ${location}. Residents advised to stay indoors and avoid the area. #Emergency #${disasterKeywords[0].replace(' ', '')}`,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Within last hour
      likes: Math.floor(Math.random() * 500) + 50,
      retweets: Math.floor(Math.random() * 200) + 20,
      verified: true,
      hashtags: ['Emergency', disasterKeywords[0].replace(' ', ''), location.replace(/[^a-zA-Z]/g, '')],
      media_urls: [`https://example.com/disaster_image_${Math.floor(Math.random() * 100)}.jpg`],
      classification: 'alert'
    },
    {
      id: `twitter_${Date.now()}_2`,
      platform: 'twitter',
      username: 'LocalResident2024',
      user_display_name: 'Sarah M.',
      post: `Need help! ${disasterKeywords[0]} near ${location}. Anyone know where the nearest shelter is? #Help #${disasterKeywords[0].replace(' ', '')} #SOS`,
      timestamp: new Date(Date.now() - Math.random() * 1800000).toISOString(), // Within last 30 min
      likes: Math.floor(Math.random() * 50) + 5,
      retweets: Math.floor(Math.random() * 20) + 2,
      verified: false,
      hashtags: ['Help', 'SOS', disasterKeywords[0].replace(' ', '')],
      media_urls: [],
      classification: 'need'
    },
    {
      id: `bluesky_${Date.now()}_3`,
      platform: 'bluesky',
      username: 'reliefvolunteer.bsky.social',
      user_display_name: 'Relief Volunteer',
      post: `🤝 Offering assistance to those affected by ${disasterKeywords[0]} in ${location}. Have supplies and transportation available. DM me if you need help. #Relief #Help`,
      timestamp: new Date(Date.now() - Math.random() * 2700000).toISOString(), // Within last 45 min
      likes: Math.floor(Math.random() * 100) + 10,
      retweets: Math.floor(Math.random() * 50) + 5,
      verified: false,
      hashtags: ['Relief', 'Help', 'Volunteer'],
      media_urls: [],
      classification: 'offer'
    },
    {
      id: `twitter_${Date.now()}_4`,
      platform: 'twitter',
      username: 'WeatherService',
      user_display_name: 'National Weather Service',
      post: `⚠️ Weather Alert: Conditions contributing to ${disasterKeywords[0]} in ${location} expected to continue for next 2-4 hours. Stay safe and monitor local emergency channels.`,
      timestamp: new Date(Date.now() - Math.random() * 5400000).toISOString(), // Within last 90 min
      likes: Math.floor(Math.random() * 300) + 100,
      retweets: Math.floor(Math.random() * 150) + 50,
      verified: true,
      hashtags: ['WeatherAlert', disasterKeywords[0].replace(' ', ''), 'Safety'],
      media_urls: [`https://example.com/weather_map_${Math.floor(Math.random() * 50)}.jpg`],
      classification: 'alert'
    },
    {
      id: `twitter_${Date.now()}_5`,
      platform: 'twitter',
      username: 'CommunityHelper',
      user_display_name: 'Community Helper',
      post: `📍 Resource Update: Emergency shelter at Community Center (123 Main St) has space available for those displaced by ${disasterKeywords[0]}. Free meals and supplies provided.`,
      timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(), // Within last 2 hours
      likes: Math.floor(Math.random() * 80) + 15,
      retweets: Math.floor(Math.random() * 40) + 8,
      verified: false,
      hashtags: ['Resources', 'Shelter', 'Community'],
      media_urls: [],
      classification: 'offer'
    }
  ];

  return mockPosts.slice(0, limit);
}

/**
 * Helper function to extract keywords from disaster
 */
function extractKeywordsFromDisaster(disaster: any): string[] {
  const text = `${disaster.title} ${disaster.description || ''}`.toLowerCase();
  const keywords = [];

  if (text.includes('flood') || text.includes('flooding')) keywords.push('flooding');
  if (text.includes('fire') || text.includes('wildfire')) keywords.push('wildfire');
  if (text.includes('earthquake') || text.includes('quake')) keywords.push('earthquake');
  if (text.includes('hurricane') || text.includes('storm')) keywords.push('hurricane');
  if (text.includes('tornado') || text.includes('twister')) keywords.push('tornado');
  if (text.includes('evacuation')) keywords.push('evacuation');
  if (text.includes('emergency')) keywords.push('emergency');

  return keywords.length > 0 ? keywords : ['emergency'];
}

/**
 * Helper function to get official updates with caching
 */
async function getOfficialUpdatesWithCache(disaster: any, limit: number) {
  const cacheKey = `official_updates:${disaster.id}`;

  try {
    // Check cache first
    const { data: cachedData } = await supabase
      .from('cache')
      .select('value')
      .eq('key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (cachedData) {
      console.log('✅ Using cached official updates');
      return cachedData.value.updates.slice(0, limit);
    }
  } catch (error) {
    console.log('No cached data found, fetching fresh updates');
  }

  // Fetch fresh data (mock scraping)
  const updates = await scrapeOfficialUpdates(disaster);

  // Cache the results for 1 hour
  try {
    await supabase
      .from('cache')
      .upsert({
        key: cacheKey,
        value: { updates, timestamp: new Date().toISOString() },
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      });
    console.log('✅ Cached official updates for 1 hour');
  } catch (error) {
    console.warn('Failed to cache official updates:', error);
  }

  return updates.slice(0, limit);
}

/**
 * Mock function to simulate scraping official updates
 */
async function scrapeOfficialUpdates(disaster: any) {
  const keywords = extractKeywordsFromDisaster(disaster);
  const location = disaster.location_name || 'affected area';

  // Simulate scraping delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const mockUpdates = [
    {
      id: `fema_${Date.now()}_1`,
      source: 'FEMA',
      source_url: 'https://www.fema.gov/disaster-updates',
      title: `Emergency Declaration for ${location}`,
      content: `FEMA has issued an emergency declaration for ${location} due to ${keywords[0]}. Federal assistance is now available to supplement state and local response efforts.`,
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      type: 'declaration',
      urgency: 'high',
      contact_info: {
        phone: '1-800-621-3362',
        website: 'https://www.disasterassistance.gov'
      }
    },
    {
      id: `redcross_${Date.now()}_2`,
      source: 'American Red Cross',
      source_url: 'https://www.redcross.org/local-updates',
      title: `Emergency Shelter Operations in ${location}`,
      content: `The American Red Cross has opened emergency shelters in ${location} for those displaced by ${keywords[0]}. Shelters provide safe lodging, meals, and basic necessities.`,
      timestamp: new Date(Date.now() - Math.random() * 1800000).toISOString(),
      type: 'shelter',
      urgency: 'medium',
      contact_info: {
        phone: '1-800-733-2767',
        website: 'https://www.redcross.org/get-help/disaster-relief-and-recovery-services'
      }
    },
    {
      id: `local_emergency_${Date.now()}_3`,
      source: 'Local Emergency Management',
      source_url: 'https://emergency.local.gov',
      title: `Evacuation Routes and Safety Information`,
      content: `Updated evacuation routes for ${location} residents affected by ${keywords[0]}. Route A: Main St to Highway 101. Route B: Oak Ave to Interstate 95. Avoid downtown area.`,
      timestamp: new Date(Date.now() - Math.random() * 2700000).toISOString(),
      type: 'evacuation',
      urgency: 'high',
      contact_info: {
        phone: '(555) 911-HELP',
        website: 'https://emergency.local.gov/evacuation'
      }
    },
    {
      id: `nws_${Date.now()}_4`,
      source: 'National Weather Service',
      source_url: 'https://weather.gov/alerts',
      title: `Weather Conditions Update for ${location}`,
      content: `Current weather conditions in ${location} continue to contribute to ${keywords[0]} risk. Residents should monitor weather alerts and follow local emergency guidance.`,
      timestamp: new Date(Date.now() - Math.random() * 5400000).toISOString(),
      type: 'weather',
      urgency: 'medium',
      contact_info: {
        phone: '(555) 123-WEATHER',
        website: 'https://weather.gov'
      }
    },
    {
      id: `utility_${Date.now()}_5`,
      source: 'Local Utilities',
      source_url: 'https://utilities.local.gov',
      title: `Power and Water Service Updates`,
      content: `Utility crews are working to restore power and water services in ${location} affected by ${keywords[0]}. Estimated restoration time: 24-48 hours for most areas.`,
      timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(),
      type: 'utilities',
      urgency: 'low',
      contact_info: {
        phone: '(555) POWER-ON',
        website: 'https://utilities.local.gov/outages'
      }
    }
  ];

  return mockUpdates;
}

/**
 * Helper function to verify image using Gemini API
 */
async function verifyImageWithGemini(imageUrl: string, disaster: any, description?: string) {
  try {
    // Import Gemini service
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const config = require('../config').default;

    if (!config.gemini?.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const disasterType = extractKeywordsFromDisaster(disaster)[0] || 'emergency';
    const location = disaster.location_name || 'unknown location';

    console.log('🤖 Fetching image from URL:', imageUrl);

    // Fetch the image data
    let imageData;
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

      imageData = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      };

      console.log('✅ Image fetched successfully, size:', arrayBuffer.byteLength, 'bytes');
    } catch (fetchError) {
      console.error('❌ Failed to fetch image:', fetchError);
      throw new Error(`Cannot access image at URL: ${imageUrl}. ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }

    const prompt = `Analyze this image for disaster verification:

Expected disaster type: ${disasterType}
Expected location: ${location}
${description ? `User description: ${description}` : ''}

Please analyze the actual image content and respond with a JSON object containing:
1. "is_authentic" (boolean) - whether the image appears to be real/unmanipulated
2. "matches_disaster_type" (boolean) - whether the image shows evidence of the expected disaster type (${disasterType})
3. "confidence_score" (0-1) - confidence in the analysis
4. "details" (string) - detailed explanation of what you see in the image
5. "detected_elements" (array) - specific elements you can see in the image
6. "manipulation_indicators" (array) - any signs of image manipulation found

IMPORTANT: Actually analyze the visual content of the image. Describe what you actually see, not what you expect to see.

Focus on:
- What is actually visible in the image
- Whether it matches the expected disaster type (${disasterType})
- Signs of digital manipulation or editing
- Image quality and authenticity markers
- Consistency with the reported location and disaster type`;

    console.log('🤖 Sending image and prompt to Gemini for analysis');

    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    const analysisText = response.text().trim();

    console.log('🤖 Gemini image analysis response:', analysisText);

    // Try to parse JSON response
    let analysis;
    try {
      // Clean up the response text to extract JSON
      let jsonText = analysisText;

      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Try to find JSON object in the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      analysis = JSON.parse(jsonText);

      // Validate required fields
      if (typeof analysis.is_authentic !== 'boolean') {
        analysis.is_authentic = !analysisText.toLowerCase().includes('fake') && !analysisText.toLowerCase().includes('manipulated');
      }
      if (typeof analysis.matches_disaster_type !== 'boolean') {
        analysis.matches_disaster_type = analysisText.toLowerCase().includes(disasterType.toLowerCase());
      }
      if (typeof analysis.confidence_score !== 'number') {
        analysis.confidence_score = 0.7;
      }
      if (!Array.isArray(analysis.detected_elements)) {
        analysis.detected_elements = ['image_analysis_completed'];
      }
      if (!Array.isArray(analysis.manipulation_indicators)) {
        analysis.manipulation_indicators = [];
      }

    } catch (parseError) {
      console.warn('Failed to parse Gemini JSON response, creating structured response:', parseError);

      // Create a structured response based on text analysis
      const lowerText = analysisText.toLowerCase();

      analysis = {
        is_authentic: !lowerText.includes('fake') && !lowerText.includes('manipulated') && !lowerText.includes('edited'),
        matches_disaster_type: lowerText.includes(disasterType.toLowerCase()) ||
                              lowerText.includes('flood') || lowerText.includes('disaster') ||
                              lowerText.includes('emergency'),
        confidence_score: 0.6,
        details: analysisText,
        detected_elements: ['text_analysis_fallback'],
        manipulation_indicators: lowerText.includes('manipulated') || lowerText.includes('edited') ?
                               ['potential_manipulation_detected'] : []
      };
    }

    // Add metadata
    analysis.verification_timestamp = new Date().toISOString();
    analysis.image_url = imageUrl;
    analysis.disaster_context = {
      type: disasterType,
      location: location,
      disaster_id: disaster.id
    };

    return analysis;

  } catch (error) {
    console.error('❌ Error in Gemini image verification:', error);

    // Determine error type for better user feedback
    let errorMessage = 'Unknown error occurred during image verification';
    let isImageAccessError = false;

    if (error instanceof Error) {
      if (error.message.includes('Cannot access image') || error.message.includes('Failed to fetch image')) {
        errorMessage = `Cannot access the image at the provided URL. Please check that the URL is valid and publicly accessible.`;
        isImageAccessError = true;
      } else if (error.message.includes('Gemini API')) {
        errorMessage = `Gemini AI service error: ${error.message}`;
      } else {
        errorMessage = error.message;
      }
    }

    // Return fallback analysis with appropriate error information
    return {
      is_authentic: null, // null indicates verification failed
      matches_disaster_type: null,
      confidence_score: 0.0,
      details: `Image verification failed: ${errorMessage}. Manual review recommended.`,
      detected_elements: isImageAccessError ? ['image_access_failed'] : ['verification_failed'],
      manipulation_indicators: [],
      verification_timestamp: new Date().toISOString(),
      image_url: imageUrl,
      disaster_context: {
        type: extractKeywordsFromDisaster(disaster)[0] || 'emergency',
        location: disaster.location_name || 'unknown location',
        disaster_id: disaster.id
      },
      error: true,
      error_type: isImageAccessError ? 'image_access_error' : 'verification_error'
    };
  }
}

export default router;
