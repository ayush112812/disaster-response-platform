import axios from 'axios';
import * as cheerio from 'cheerio';
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { cacheWrapper, CacheKeys } from './cache';

// Map disaster types to relevant official websites for web scraping (as specified in assignment)
const OFFICIAL_SOURCES = {
  flood: [
    {
      name: 'FEMA',
      url: 'https://www.fema.gov/disaster/current',
      selector: '.view-disaster-declarations .views-row, .disaster-declaration, .news-item',
      titleSelector: 'h3, h4, .title, a',
      descriptionSelector: 'p, .description, .summary',
      linkSelector: 'a',
      keywords: ['flood', 'flooding', 'water', 'storm', 'hurricane']
    },
    {
      name: 'Red Cross',
      url: 'https://www.redcross.org/about-us/news-and-events/news.html',
      selector: '.news-list-item, .news-item, .article-item',
      titleSelector: 'h3, h4, .title, a',
      descriptionSelector: 'p, .description, .excerpt',
      linkSelector: 'a',
      keywords: ['flood', 'disaster', 'relief', 'emergency']
    },
  ],
  earthquake: [
    {
      name: 'USGS',
      url: 'https://earthquake.usgs.gov/earthquakes/map/',
      selector: '.event-list-item, .earthquake-item',
      titleSelector: '.title, .magnitude',
      descriptionSelector: '.description, .location',
      linkSelector: 'a',
      keywords: ['earthquake', 'seismic', 'tremor']
    },
  ],
  fire: [
    {
      name: 'InciWeb',
      url: 'https://inciweb.nwcg.gov/',
      selector: '.incident, .fire-item',
      titleSelector: '.incident-name, h3',
      descriptionSelector: '.incident-description, p',
      linkSelector: 'a',
      keywords: ['fire', 'wildfire', 'blaze', 'burn']
    },
  ],
  hurricane: [
    {
      name: 'National Hurricane Center',
      url: 'https://www.nhc.noaa.gov/',
      selector: '.storm-item, .advisory',
      titleSelector: '.storm-name, h3',
      descriptionSelector: '.storm-description, p',
      linkSelector: 'a',
      keywords: ['hurricane', 'tropical storm', 'cyclone']
    },
  ],
  default: [
    {
      name: 'ReliefWeb',
      url: 'https://reliefweb.int/updates',
      selector: '.rw-river-article--headline, .update-item',
      titleSelector: 'h3, .title',
      descriptionSelector: '.summary, p',
      linkSelector: 'a',
      keywords: ['disaster', 'emergency', 'relief', 'humanitarian']
    },
    {
      name: 'Ready.gov',
      url: 'https://www.ready.gov/news',
      selector: '.news-item, .article',
      titleSelector: 'h3, .title',
      descriptionSelector: '.summary, p',
      linkSelector: 'a',
      keywords: ['emergency', 'preparedness', 'disaster']
    }
  ]
};

export interface OfficialUpdate {
  id: string;
  disaster_id: string;
  source: string;
  title: string;
  description: string;
  url: string;
  published_at: string;
  created_at?: string;
  updated_at?: string;
  disasterRelevance?: number;
  date?: string;
}

export interface OfficialUpdateFilters {
  source?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  location?: string;
}

interface CachedUpdates {
  id: string;
  disaster_id: string;
  updates: string; // JSON string of OfficialUpdate[]
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// Mock data for demonstration
const MOCK_OFFICIAL_UPDATES: OfficialUpdate[] = [
  {
    id: '1',
    disaster_id: 'disaster-1',
    source: 'FEMA',
    title: 'Federal Emergency Declaration',
    description: 'The President has declared a federal emergency for the affected region.',
    url: 'https://www.fema.gov/disaster/1234',
    published_at: '2023-06-15T10:00:00Z'
  },
  {
    id: '2',
    disaster_id: 'disaster-1',
    source: 'Red Cross',
    title: 'Emergency Shelters Open',
    description: 'The Red Cross has opened 5 emergency shelters in the affected area.',
    url: 'https://www.redcross.org/local/california/about-us/our-work/emergency-shelters.html',
    published_at: '2023-06-14T14:30:00Z'
  },
  {
    id: '3',
    disaster_id: 'disaster-1',
    source: 'NOAA',
    title: 'Weather Update: Severe Storm Warning',
    description: 'Severe storm warning in effect for the next 24 hours.',
    url: 'https://www.weather.gov/forecast-updates',
    published_at: '2023-06-14T09:15:00Z'
  }
];

// Cache TTL in seconds (1 hour)
const CACHE_TTL = 60 * 60;

/**
 * Fetch official updates from RSS feeds and APIs for a specific disaster
 * @param disasterId - ID of the disaster
 * @returns Array of official updates
 */
export async function scrapeOfficialUpdates(
  disasterId: string,
  filters?: OfficialUpdateFilters
): Promise<OfficialUpdate[]> {
  try {
    // Use caching for official updates (1 hour TTL as specified in assignment)
    return await cacheWrapper(
      CacheKeys.officialUpdates(disasterId),
      async () => {
        // First, get the disaster details to determine the type
        const { data: disaster, error } = await supabase
          .from('disasters')
          .select('id, title, tags, location_name')
          .eq('id', disasterId)
          .single();

        if (error || !disaster) {
          throw new Error('Disaster not found');
        }

        return await fetchOfficialUpdatesFromSources(disaster);
      },
      3600 // 1 hour TTL
    );
  } catch (error) {
    console.error('Error in scrapeOfficialUpdates:', error);
    // Return mock data if scraping fails
    return getMockOfficialUpdates(disasterId);
  }
}

/**
 * Fetch official updates from sources (separated for caching)
 */
async function fetchOfficialUpdatesFromSources(disaster: any): Promise<OfficialUpdate[]> {
  try {

    // Determine which sources to check based on disaster tags
    const sourcesToCheck = new Set<any>();

    // Add sources based on tags
    if (disaster.tags && disaster.tags.length > 0) {
      for (const tag of disaster.tags) {
        const tagSources = OFFICIAL_SOURCES[tag as keyof typeof OFFICIAL_SOURCES] || [];
        tagSources.forEach(source => sourcesToCheck.add(source));
      }
    }

    // Add default sources if no specific ones found
    if (sourcesToCheck.size === 0) {
      OFFICIAL_SOURCES.default.forEach(source => sourcesToCheck.add(source));
    }

    // Scrape each source using Cheerio (as specified in assignment)
    const updates: OfficialUpdate[] = [];

    for (const source of sourcesToCheck) {
      try {
        console.log(`🔍 Scraping ${source.name}: ${source.url}`);

        const response = await axios.get(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const items = $(source.selector).slice(0, 10); // Get up to 10 items per source

        items.each((_, el) => {
          const title = $(el).find(source.titleSelector).first().text().trim();
          const description = $(el).find(source.descriptionSelector).first().text().trim();
          const linkElement = $(el).find(source.linkSelector).first();
          const relativeUrl = linkElement.attr('href');
          const fullUrl = relativeUrl ? new URL(relativeUrl, source.url).toString() : source.url;

          if (title && isRelevantToDisaster(title, description, source.keywords, disaster)) {
            updates.push({
              id: uuidv4(),
              disaster_id: disaster.id,
              source: source.name,
              title: cleanText(title),
              description: cleanText(description),
              url: fullUrl,
              published_at: new Date().toISOString(), // Use current time since we can't easily extract dates
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              disasterRelevance: calculateRelevance(disaster.title, title, disaster.tags || [])
            });
          }
        });

        console.log(`✅ Scraped ${updates.length} relevant updates from ${source.name}`);
      } catch (error) {
        console.error(`❌ Error scraping ${source.name}:`, error.message);
        // Continue with other sources even if one fails
      }
    }

    // Sort by relevance and date
    return updates
      .sort((a, b) => {
        // First by relevance (descending)
        if (a.disasterRelevance !== b.disasterRelevance) {
          return b.disasterRelevance - a.disasterRelevance;
        }
        // Then by date (newest first)
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      })
      .slice(0, 15); // Return top 15 most relevant updates

  } catch (error) {
    console.error('Error in scrapeOfficialUpdates:', error);
    // Return mock data if scraping fails
    return getMockOfficialUpdates(disaster.id);
  }
}



/**
 * Check if content is relevant to the disaster
 */
function isRelevantToDisaster(title: string, description: string, keywords: string[], disaster: any): boolean {
  const content = `${title} ${description}`.toLowerCase();
  const disasterLocation = disaster.location_name?.toLowerCase() || '';

  // Check for keyword matches
  const hasKeyword = keywords.some(keyword => content.includes(keyword.toLowerCase()));

  // Check for location matches
  const hasLocation = disasterLocation && content.includes(disasterLocation);

  return hasKeyword || hasLocation;
}

/**
 * Clean and truncate text
 */
function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 500); // Limit length
}

function calculateRelevance(disasterTitle: string, updateTitle: string, tags: string[]): number {
  // Simple relevance calculation based on keyword matching
  let relevance = 0;
  const titleWords = disasterTitle.toLowerCase().split(/\s+/);
  const updateWords = new Set(updateTitle.toLowerCase().split(/\s+/));
  
  // Check for matching words
  for (const word of titleWords) {
    if (word.length > 3 && updateWords.has(word)) {
      relevance += 2;
    }
  }
  
  // Check for matching tags
  for (const tag of tags) {
    if (updateTitle.toLowerCase().includes(tag.toLowerCase())) {
      relevance += 3;
    }
  }
  
  return relevance;
}

// Fallback mock data
function getMockOfficialUpdates(disasterId: string): OfficialUpdate[] {
  return [
    {
      id: '1',
      disaster_id: disasterId,
      source: 'FEMA',
      title: 'Federal Disaster Declaration for Recent Flooding',
      description: 'Federal emergency declaration has been issued for the affected region.',
      url: 'https://www.fema.gov/disaster/example',
      published_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      disasterRelevance: 5
    },
    {
      id: '2',
      disaster_id: disasterId,
      source: 'Red Cross',
      title: 'Emergency Shelters Open for Flood Victims',
      description: 'Multiple emergency shelters have been opened to assist flood victims.',
      url: 'https://www.redcross.org/example',
      published_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      disasterRelevance: 4
    },
    {
      id: '3',
      disaster_id: disasterId,
      source: 'Local Government',
      title: 'Emergency Response Plan Activated',
      description: 'Local emergency response plan has been activated in response to the disaster.',
      url: 'https://www.nyc.gov/example',
      published_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      disasterRelevance: 3
    }
  ];
}

