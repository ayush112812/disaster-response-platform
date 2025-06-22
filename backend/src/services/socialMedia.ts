import { supabase } from './supabase';

// Priority keywords for urgent alerts
const PRIORITY_KEYWORDS = [
  'urgent', 'emergency', 'sos', 'help', 'trapped', 'injured', 'medical emergency',
  'evacuation', 'immediate', 'critical', 'life threatening', 'rescue needed',
  'stranded', 'missing person', 'casualties', 'severe', 'dangerous'
];

// Enhanced mock social media data with more variety for demonstration
const MOCK_SOCIAL_MEDIA_DATA = [
  // NYC Flood Emergency Posts
  {
    id: '1',
    user: 'citizen1',
    content: 'URGENT! Heavy flooding in downtown Manhattan! Streets are completely underwater. People trapped on 2nd floor! #flood #emergency #help',
    timestamp: new Date().toISOString(),
    location: 'Manhattan, NYC',
    isUrgent: true,
    keywords: ['flood', 'emergency', 'water', 'help', 'urgent', 'trapped'],
    type: 'need'
  },
  {
    id: '2',
    user: 'local_news_nyc',
    content: 'Emergency shelters opened in Brooklyn and Queens due to severe flooding. More info at nyc.gov #nycflood',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    location: 'Brooklyn, NYC',
    isUrgent: false,
    keywords: ['shelter', 'flood', 'emergency', 'help'],
    type: 'offer'
  },

  // California Wildfire Posts
  {
    id: '3',
    user: 'cal_fire_official',
    content: 'CRITICAL! Wildfire spreading rapidly near Napa Valley! IMMEDIATE EVACUATION required for zones A-C! #wildfire #evacuation #critical',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    location: 'Napa Valley, CA',
    isUrgent: true,
    keywords: ['wildfire', 'evacuation', 'critical', 'immediate', 'fire'],
    type: 'alert'
  },
  {
    id: '4',
    user: 'resident_napa',
    content: 'Smoke everywhere! Can barely see 10 feet ahead. Roads blocked by fallen trees. Need help evacuating elderly neighbors! #wildfire #help',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    location: 'Napa Valley, CA',
    isUrgent: true,
    keywords: ['smoke', 'help', 'evacuation', 'elderly', 'wildfire'],
    type: 'need'
  },

  // Hurricane Posts
  {
    id: '5',
    user: 'weather_service',
    content: 'Hurricane Category 4 approaching Gulf Coast! Storm surge 15-20 feet expected. EVACUATE NOW if in evacuation zones! #hurricane #evacuation',
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    location: 'Gulf Coast, FL',
    isUrgent: true,
    keywords: ['hurricane', 'evacuation', 'storm surge', 'emergency'],
    type: 'alert'
  },
  {
    id: '6',
    user: 'florida_resident',
    content: 'Boarding up windows and heading inland. Hurricane winds already picking up. Stay safe everyone! #hurricane #safety',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    location: 'Tampa, FL',
    isUrgent: false,
    keywords: ['hurricane', 'safety', 'winds'],
    type: 'general'
  },

  // Earthquake Posts
  {
    id: '7',
    user: 'usgs_earthquake',
    content: 'EARTHQUAKE ALERT: 6.2 magnitude earthquake detected near Los Angeles. Aftershocks expected. Check for injuries and damage! #earthquake #alert',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    location: 'Los Angeles, CA',
    isUrgent: true,
    keywords: ['earthquake', 'alert', 'magnitude', 'aftershocks', 'injuries'],
    type: 'alert'
  },
  {
    id: '8',
    user: 'la_resident',
    content: 'Building shaking stopped but car alarms going off everywhere. Checking on neighbors now. #earthquake #community',
    timestamp: new Date(Date.now() - 720000).toISOString(),
    location: 'Los Angeles, CA',
    isUrgent: false,
    keywords: ['earthquake', 'community', 'neighbors'],
    type: 'general'
  },

  // Tornado Posts
  {
    id: '9',
    user: 'storm_chaser',
    content: 'TORNADO ON GROUND! Large tornado confirmed near Oklahoma City! Take shelter immediately! #tornado #shelter #emergency',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    location: 'Oklahoma City, OK',
    isUrgent: true,
    keywords: ['tornado', 'shelter', 'emergency', 'immediate'],
    type: 'alert'
  },
  {
    id: '10',
    user: 'ok_emergency',
    content: 'Tornado warning in effect until 8 PM. Seek shelter in interior room on lowest floor. #tornado #warning #safety',
    timestamp: new Date(Date.now() - 1500000).toISOString(),
    location: 'Oklahoma City, OK',
    isUrgent: true,
    keywords: ['tornado', 'warning', 'shelter', 'safety'],
    type: 'alert'
  },

  // Blizzard Posts
  {
    id: '11',
    user: 'denver_weather',
    content: 'Blizzard conditions with 60+ mph winds and zero visibility. DO NOT TRAVEL! Multiple vehicles stranded on I-25! #blizzard #travel',
    timestamp: new Date(Date.now() - 2100000).toISOString(),
    location: 'Denver, CO',
    isUrgent: true,
    keywords: ['blizzard', 'travel', 'stranded', 'emergency'],
    type: 'alert'
  },
  {
    id: '12',
    user: 'colorado_resident',
    content: 'Power out for 6 hours now. Running low on heating fuel. Anyone know when crews can get through? #blizzard #power #help',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    location: 'Denver, CO',
    isUrgent: false,
    keywords: ['power', 'heating', 'help', 'blizzard'],
    type: 'need'
  },

  // Medical Emergency Posts
  {
    id: '13',
    user: 'emergency_responder',
    content: 'SOS! Medical emergency at Central Hospital. Need ambulance access through flood zone!!! #medical #emergency #sos',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    location: 'Central Hospital, NYC',
    isUrgent: true,
    keywords: ['medical', 'emergency', 'sos', 'ambulance', 'hospital'],
    type: 'need'
  },
  {
    id: '14',
    user: 'family_alert',
    content: 'Family of 4 stranded on rooftop at 123 Oak Street. RESCUE NEEDED ASAP! Water still rising! #rescue #stranded #family',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    location: '123 Oak Street, NYC',
    isUrgent: true,
    keywords: ['rescue', 'stranded', 'family', 'rooftop', 'immediate'],
    type: 'need'
  },

  // Volunteer and Relief Posts
  {
    id: '15',
    user: 'volunteer_network',
    content: 'Volunteers needed for flood relief in Lower East Side. DM for details. #volunteer #nycflood',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    location: 'Lower East Side, NYC',
    isUrgent: false,
    keywords: ['volunteer', 'help needed', 'flood', 'relief'],
    type: 'need'
  },
  {
    id: '16',
    user: 'red_cross',
    content: 'Mobile blood drive cancelled due to severe weather. Rescheduling for next week. #redcross #blood #weather',
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    location: 'Dallas, TX',
    isUrgent: false,
    keywords: ['blood', 'weather', 'cancelled'],
    type: 'general'
  },

  // Additional posts with more variety
  {
    id: '17',
    user: 'community_center',
    content: 'Offering free meals and shelter for flood victims. Open 24/7. No questions asked. #shelter #food #help',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    location: 'Community Center, NYC',
    isUrgent: false,
    keywords: ['shelter', 'food', 'help', 'free'],
    type: 'offer'
  },
  {
    id: '18',
    user: 'local_business',
    content: 'Our store has extra water bottles and blankets available for anyone in need. Come by anytime! #water #blankets #free',
    timestamp: new Date(Date.now() - 2700000).toISOString(),
    location: 'Main Street Store, NYC',
    isUrgent: false,
    keywords: ['water', 'blankets', 'free', 'available'],
    type: 'offer'
  }
];

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;

export async function getSocialMediaPosts(disasterId: string, options: {
  limit?: number;
  offset?: number;
  isUrgent?: boolean;
  keywords?: string[];
  type?: 'need' | 'offer' | 'alert' | 'general';
} = {}) {
  const { limit = 10, offset = 0, isUrgent, keywords = [], type } = options;

  // In a real implementation, this would fetch from Twitter/Bluesky API
  // For demonstration, we'll randomize the data to show variety
  let posts = [...MOCK_SOCIAL_MEDIA_DATA];

  // Shuffle posts for variety in demonstration
  posts = posts.sort(() => Math.random() - 0.5);

  // Add some dynamic timestamps to make posts appear "fresh"
  posts = posts.map((post, index) => {
    const updatedPost = {
      ...post,
      timestamp: new Date(Date.now() - (index * 300000) - Math.random() * 1800000).toISOString()
    };

    // Apply classification if not already present
    if (!updatedPost.type) {
      const analysis = analyzePost(updatedPost.content);
      updatedPost.type = analysis.type;
    }

    return updatedPost;
  });

  // Filter by urgency if specified
  if (isUrgent !== undefined) {
    posts = posts.filter(post => post.isUrgent === isUrgent);
  }

  // Filter by type if specified
  if (type) {
    posts = posts.filter(post => post.type === type);
  }

  // Filter by keywords if specified
  if (keywords.length > 0) {
    const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
    posts = posts.filter(post =>
      post.keywords.some(kw => keywordSet.has(kw.toLowerCase()))
    );
  }

  // Apply pagination
  const paginatedPosts = posts.slice(offset, offset + limit);

  // In a real implementation, we would cache the API response
  await cacheSocialMediaData(disasterId, paginatedPosts);

  // Calculate type counts for statistics
  const typeCounts = {
    need: posts.filter(p => p.type === 'need').length,
    offer: posts.filter(p => p.type === 'offer').length,
    alert: posts.filter(p => p.type === 'alert').length,
    general: posts.filter(p => p.type === 'general').length
  };

  return {
    data: paginatedPosts,
    total: posts.length,
    limit,
    offset,
    typeCounts
  };
}

async function cacheSocialMediaData(disasterId: string, posts: any[]) {
  const cacheKey = `social_media_${disasterId}`;
  const expiresAt = new Date(Date.now() + CACHE_DURATION).toISOString();
  
  await supabase
    .from('cache')
    .upsert({
      key: cacheKey,
      value: { data: posts },
      expires_at: expiresAt
    });
}

export async function getCachedSocialMedia(disasterId: string) {
  const cacheKey = `social_media_${disasterId}`;
  
  const { data, error } = await supabase
    .from('cache')
    .select('value')
    .eq('key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();
    
  if (error || !data) {
    return null;
  }
  
  return data.value;
}

// Classify social media post as need, offer, or alert
export function classifyPost(content: string): 'need' | 'offer' | 'alert' | 'general' {
  const contentLower = content.toLowerCase();

  // Need keywords - people asking for help or resources
  const needKeywords = [
    'need', 'help', 'require', 'looking for', 'seeking', 'request', 'asking for',
    'desperate', 'running out', 'shortage', 'lacking', 'missing', 'without',
    'please help', 'assistance needed', 'support needed', 'rescue needed'
  ];

  // Offer keywords - people providing help or resources
  const offerKeywords = [
    'offering', 'providing', 'available', 'have', 'can provide', 'donating',
    'giving', 'sharing', 'volunteer', 'helping', 'assistance available',
    'shelter available', 'food available', 'supplies available', 'can help',
    'open to', 'free', 'no charge'
  ];

  // Alert keywords - warnings, notifications, official updates
  const alertKeywords = [
    'alert', 'warning', 'evacuation', 'emergency', 'urgent', 'critical',
    'breaking', 'update', 'announcement', 'notice', 'advisory', 'bulletin',
    'attention', 'caution', 'danger', 'hazard', 'threat', 'risk'
  ];

  // Check for need classification
  const hasNeedKeywords = needKeywords.some(kw => contentLower.includes(kw));

  // Check for offer classification
  const hasOfferKeywords = offerKeywords.some(kw => contentLower.includes(kw));

  // Check for alert classification
  const hasAlertKeywords = alertKeywords.some(kw => contentLower.includes(kw));

  // Prioritize classification (alert > need > offer > general)
  if (hasAlertKeywords) return 'alert';
  if (hasNeedKeywords) return 'need';
  if (hasOfferKeywords) return 'offer';

  return 'general';
}

// Analyze social media post for urgency and keywords
export function analyzePost(content: string) {
  const disasterKeywords = ['flood', 'earthquake', 'fire', 'disaster', 'emergency', 'hurricane', 'tornado', 'wildfire'];

  const contentLower = content.toLowerCase();

  // Check for priority keywords
  const isUrgent = PRIORITY_KEYWORDS.some(kw => contentLower.includes(kw.toLowerCase()));

  // Check for multiple exclamation marks (indicates urgency)
  const hasUrgentPunctuation = (content.match(/!/g) || []).length >= 2;

  // Check for all caps words (indicates shouting/urgency)
  const hasAllCapsWords = /\b[A-Z]{3,}\b/.test(content);

  // Final urgency determination
  const finalIsUrgent = isUrgent || hasUrgentPunctuation || hasAllCapsWords;

  // Extract all relevant keywords
  const keywords = [...PRIORITY_KEYWORDS, ...disasterKeywords].filter(kw =>
    contentLower.includes(kw.toLowerCase())
  );

  // Get post classification
  const postType = classifyPost(content);

  return {
    isUrgent: finalIsUrgent,
    keywords,
    urgencyScore: (isUrgent ? 3 : 0) + (hasUrgentPunctuation ? 2 : 0) + (hasAllCapsWords ? 1 : 0),
    type: postType
  };
}


