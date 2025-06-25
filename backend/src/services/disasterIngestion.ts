import { supabase } from './supabase';
import { verifyDisasterImage, extractLocationFromText } from './gemini';
import { analyzePost } from './socialMedia';
import { emitToAll } from '../websocket';

export interface SocialMediaReport {
  id: string;
  text: string;
  username: string;
  platform: 'twitter' | 'bluesky' | 'facebook' | 'instagram';
  timestamp: string;
  location?: string;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
}

export interface DisasterReport {
  text: string;
  images?: string[];
  location?: string;
  source: 'user_input' | 'social_media' | 'api';
  sourceData?: SocialMediaReport;
  reportedBy?: string;
}

// Keywords that indicate disaster-related content
const DISASTER_KEYWORDS = [
  'earthquake', 'flood', 'fire', 'wildfire', 'hurricane', 'tornado', 'tsunami',
  'landslide', 'avalanche', 'volcano', 'storm', 'cyclone', 'typhoon',
  'emergency', 'disaster', 'evacuation', 'rescue', 'trapped', 'injured',
  'damage', 'destroyed', 'collapsed', 'emergency services', 'first responders'
];

// Severity keywords
const HIGH_SEVERITY_KEYWORDS = [
  'major', 'massive', 'devastating', 'catastrophic', 'severe', 'critical',
  'life threatening', 'multiple casualties', 'widespread damage', 'total destruction'
];

const MEDIUM_SEVERITY_KEYWORDS = [
  'significant', 'moderate', 'considerable', 'substantial', 'serious',
  'some damage', 'injuries reported', 'road closures', 'power outages'
];

/**
 * Analyze text to determine if it contains disaster-related information
 */
export function isDisasterRelated(text: string): boolean {
  const textLower = text.toLowerCase();
  return DISASTER_KEYWORDS.some(keyword => textLower.includes(keyword));
}

/**
 * Determine disaster severity from text content
 */
export function determineSeverity(text: string): 'low' | 'medium' | 'high' {
  console.log('🔍 Analyzing severity for text:', text);
  const textLower = text.toLowerCase();

  // Check for high severity keywords
  const highMatches = HIGH_SEVERITY_KEYWORDS.filter(keyword => textLower.includes(keyword));
  if (highMatches.length > 0) {
    console.log('✅ High severity detected, keywords:', highMatches);
    return 'high';
  }

  // Check for medium severity keywords
  const mediumMatches = MEDIUM_SEVERITY_KEYWORDS.filter(keyword => textLower.includes(keyword));
  if (mediumMatches.length > 0) {
    console.log('✅ Medium severity detected, keywords:', mediumMatches);
    return 'medium';
  }

  console.log('⚠️ Low severity (no severity keywords found)');
  return 'low';
}

/**
 * Extract disaster type from text content
 */
export function extractDisasterType(text: string): string {
  console.log('🔍 Analyzing disaster type for text:', text);
  const textLower = text.toLowerCase();

  const typeKeywords = {
    'earthquake': ['earthquake', 'quake', 'seismic', 'tremor'],
    'flood': ['flood', 'flooding', 'inundation', 'overflow', 'deluge'],
    'fire': ['fire', 'wildfire', 'blaze', 'inferno', 'burning'],
    'hurricane': ['hurricane', 'cyclone', 'typhoon'],
    'tornado': ['tornado', 'twister', 'funnel cloud'],
    'storm': ['storm', 'thunderstorm', 'severe weather'],
    'landslide': ['landslide', 'mudslide', 'rockslide'],
    'tsunami': ['tsunami', 'tidal wave'],
    'volcano': ['volcano', 'volcanic', 'eruption', 'lava'],
    'avalanche': ['avalanche', 'snow slide']
  };

  for (const [type, keywords] of Object.entries(typeKeywords)) {
    const matches = keywords.filter(keyword => textLower.includes(keyword));
    if (matches.length > 0) {
      console.log(`✅ Disaster type detected: ${type}, keywords:`, matches);
      return type;
    }
  }

  console.log('⚠️ No specific disaster type found, defaulting to "other"');
  return 'other';
}

/**
 * Generate disaster title from text content
 */
export function generateDisasterTitle(text: string, location?: string): string {
  const disasterType = extractDisasterType(text);
  const severity = determineSeverity(text);
  
  let title = '';
  
  if (severity === 'high') {
    title += 'Major ';
  } else if (severity === 'medium') {
    title += 'Significant ';
  }
  
  title += disasterType.charAt(0).toUpperCase() + disasterType.slice(1);
  
  if (location) {
    title += ` in ${location}`;
  }
  
  return title;
}

/**
 * Process social media post and create disaster if relevant
 */
export async function processSocialMediaPost(post: SocialMediaReport): Promise<string | null> {
  console.log('🔍 Processing social media post for disaster content:', post.id);
  
  // Check if post is disaster-related
  if (!isDisasterRelated(post.text)) {
    console.log('❌ Post not disaster-related, skipping');
    return null;
  }
  
  console.log('✅ Disaster-related content detected');
  
  try {
    // Extract location from text
    let location = post.location;
    let coordinates = null;
    
    if (!location) {
      const locationResult = await extractLocationFromText(post.text);
      if (locationResult.extractedLocation) {
        location = locationResult.extractedLocation;
        coordinates = locationResult.coordinates;
      }
    }
    
    // Analyze post for urgency and classification
    const analysis = analyzePost(post.text);
    
    // Determine disaster properties
    const disasterType = extractDisasterType(post.text);
    const severity = determineSeverity(post.text);
    const title = generateDisasterTitle(post.text, location);
    
    // Verify images if present
    let imageVerification = null;
    if (post.mediaUrls && post.mediaUrls.length > 0) {
      try {
        imageVerification = await verifyDisasterImage(post.mediaUrls[0]);
      } catch (error) {
        console.warn('Image verification failed:', error);
      }
    }
    
    // Create disaster entry (matching actual database schema)
    const disasterData = {
      title,
      description: post.text,
      location_name: location || 'Unknown location',
      tags: [disasterType, severity, analysis.isUrgent ? 'verified' : 'reported', ...analysis.keywords, post.platform, 'social_media'],
      owner_id: 'social_media_bot'
      // Note: Storing type, severity, status in tags array since those columns don't exist in the actual schema
    };
    
    // Insert into database
    const { data: disaster, error } = await supabase
      .from('disasters')
      .insert(disasterData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating disaster from social media:', error);
      return null;
    }
    
    console.log('✅ Created disaster from social media post:', disaster.id);
    
    // Create initial report
    const reportData = {
      disaster_id: disaster.id,
      user_id: 'social_media_bot',
      content: `Social media report from @${post.username} on ${post.platform}`,
      image_url: post.mediaUrls?.[0],
      verification_status: imageVerification?.isAuthentic ? 'verified' : 'pending',
      metadata: {
        social_media_post: post,
        analysis,
        image_verification: imageVerification
      }
    };
    
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert(reportData)
      .select()
      .single();
    
    if (reportError) {
      console.warn('Error creating report:', reportError);
    }
    
    // Emit real-time updates
    emitToAll('disaster_created', disaster);
    if (analysis.isUrgent) {
      emitToAll('priority_alert', {
        type: 'disaster_created',
        disaster,
        urgency: analysis.urgencyScore,
        source: 'social_media'
      });
    }
    
    return disaster.id;
    
  } catch (error) {
    console.error('Error processing social media post:', error);
    return null;
  }
}

/**
 * Create disaster from user input (form submission)
 */
export async function createDisasterFromUserInput(report: DisasterReport, userId: string): Promise<string> {
  console.log('🔍 Creating disaster from user input');
  
  try {
    // Extract location if not provided
    let location = report.location;
    let coordinates = null;
    
    if (!location) {
      const locationResult = await extractLocationFromText(report.text);
      if (locationResult.extractedLocation) {
        location = locationResult.extractedLocation;
        coordinates = locationResult.coordinates;
      }
    }
    
    // Determine disaster properties
    const disasterType = extractDisasterType(report.text);
    const severity = determineSeverity(report.text);
    const title = generateDisasterTitle(report.text, location);
    
    // Verify images if present
    let imageVerification = null;
    if (report.images && report.images.length > 0) {
      try {
        imageVerification = await verifyDisasterImage(report.images[0]);
      } catch (error) {
        console.warn('Image verification failed:', error);
      }
    }
    
    // Create disaster entry with PostGIS location data
    const disasterData: any = {
      title,
      description: report.text,
      location_name: location || 'Unknown location',
      tags: [disasterType, severity, 'user_report', 'reported'],
      owner_id: userId
    };

    // Add PostGIS location if coordinates are available
    if (coordinates) {
      // Store as PostGIS GEOGRAPHY(Point) using ST_SetSRID(ST_Point(lng, lat), 4326)
      disasterData.location = `POINT(${coordinates.lng} ${coordinates.lat})`;
      console.log('📍 Storing coordinates:', coordinates);
    }
    
    // Insert into database
    const { data: disaster, error } = await supabase
      .from('disasters')
      .insert(disasterData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create disaster: ${error.message}`);
    }
    
    console.log('✅ Created disaster from user input:', disaster.id);
    
    // Create initial report
    if (report.images && report.images.length > 0) {
      const reportData = {
        disaster_id: disaster.id,
        user_id: userId,
        content: report.text,
        image_url: report.images[0],
        verification_status: imageVerification?.isAuthentic ? 'verified' : 'pending',
        metadata: {
          image_verification: imageVerification
        }
      };
      
      const { error: reportError } = await supabase
        .from('reports')
        .insert(reportData);
      
      if (reportError) {
        console.warn('Error creating report:', reportError);
      }
    }
    
    // Emit real-time updates
    emitToAll('disaster_created', disaster);
    
    return disaster.id;
    
  } catch (error) {
    console.error('Error creating disaster from user input:', error);
    throw error;
  }
}

/**
 * Mock Twitter/Bluesky API integration
 * In production, this would connect to real social media APIs
 */
export async function ingestSocialMediaData(): Promise<void> {
  console.log('🔍 Ingesting social media data...');
  
  // Mock social media posts that could create disasters
  const mockPosts: SocialMediaReport[] = [
    {
      id: `twitter_${Date.now()}_1`,
      text: "URGENT: Major earthquake just hit downtown San Francisco! Buildings shaking, people evacuating. Magnitude feels like 6.0+. #earthquake #SanFrancisco #emergency",
      username: "SF_Resident_2024",
      platform: "twitter",
      timestamp: new Date().toISOString(),
      location: "San Francisco, CA",
      hashtags: ["earthquake", "SanFrancisco", "emergency"],
      mediaUrls: ["https://example.com/earthquake_damage.jpg"]
    },
    {
      id: `bluesky_${Date.now()}_2`,
      text: "Flash flooding on Highway 101 near Palo Alto. Water is 3 feet deep, cars stranded. Avoid this area! Emergency crews on scene.",
      username: "traffic_alert_ca",
      platform: "bluesky",
      timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      location: "Palo Alto, CA",
      hashtags: ["flooding", "traffic", "emergency"]
    },
    {
      id: `twitter_${Date.now()}_3`,
      text: "Wildfire spotted near Napa Valley. Smoke visible from miles away. Fire department responding. Residents in area should prepare for possible evacuation.",
      username: "napa_fire_watch",
      platform: "twitter",
      timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      location: "Napa Valley, CA",
      hashtags: ["wildfire", "evacuation", "NapaValley"]
    }
  ];
  
  // Process each post
  for (const post of mockPosts) {
    try {
      const disasterId = await processSocialMediaPost(post);
      if (disasterId) {
        console.log(`✅ Created disaster ${disasterId} from social media post ${post.id}`);
      }
    } catch (error) {
      console.error(`Error processing post ${post.id}:`, error);
    }
    
    // Add delay between processing to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('✅ Social media data ingestion complete');
}
