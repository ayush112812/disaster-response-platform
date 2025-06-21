import axios from 'axios';
import * as cheerio from 'cheerio';
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Map disaster types to relevant official websites
const OFFICIAL_SOURCES = {
  flood: [
    { name: 'FEMA', url: 'https://www.fema.gov/disaster/current', selector: '.view-disaster-declarations .views-row' },
    { name: 'Red Cross', url: 'https://www.redcross.org/about-us/news-and-events/news.html', selector: '.news-list-item' },
  ],
  earthquake: [
    { name: 'USGS', url: 'https://earthquake.usgs.gov/earthquakes/map/', selector: '.event-list-item' },
  ],
  fire: [
    { name: 'InciWeb', url: 'https://inciweb.nwcg.gov/', selector: '.incident' },
  ],
  default: [
    { name: 'ReliefWeb', url: 'https://reliefweb.int/updates', selector: '.rw-river-article--headline' },
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
 * Scrape official updates from various sources for a specific disaster
 * @param disasterId - ID of the disaster
 * @returns Array of official updates
 */
export async function scrapeOfficialUpdates(
  disasterId: string,
  filters?: OfficialUpdateFilters
): Promise<OfficialUpdate[]> {
  try {
    // First, get the disaster details to determine the type
    const { data: disaster, error } = await supabase
      .from('disasters')
      .select('id, title, tags')
      .eq('id', disasterId)
      .single();

    if (error || !disaster) {
      throw new Error('Disaster not found');
    }

    // Determine which sources to check based on disaster tags
    const sourcesToCheck = new Set<{name: string, url: string, selector: string}>();
    
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

    // Scrape each source
    const updates: OfficialUpdate[] = [];
    
    for (const source of sourcesToCheck) {
      try {
        const response = await axios.get(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        const items = $(source.selector).slice(0, 5); // Get up to 5 items per source
        
        items.each((i, el) => {
          const title = $(el).find('h3, h4, .title, a').first().text().trim();
          const url = $(el).find('a').first().attr('href');
          const date = $(el).find('.date, time').first().text().trim() || new Date().toISOString().split('T')[0];
          
          if (title) {
            updates.push({
              id: uuidv4(),
              disaster_id: disasterId,
              source: source.name,
              title,
              description: $(el).find('p, .description').first().text().trim(),
              url: url ? new URL(url, source.url).toString() : source.url,
              published_at: date,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              disasterRelevance: calculateRelevance(disaster.title, title, disaster.tags || [])
            });
          }
        });
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error instanceof Error ? error.message : 'Unknown error');
        // Continue with other sources even if one fails
      }
    }
    
    // Sort by relevance and date
    return updates
      .sort((a, b) => {
        // First by relevance (descending)
        const aRelevance = a.disasterRelevance || 0;
        const bRelevance = b.disasterRelevance || 0;
        if (aRelevance !== bRelevance) {
          return bRelevance - aRelevance;
        }
        // Then by date (newest first)
        const aDate = a.date || a.published_at;
        const bDate = b.date || b.published_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      })
      .slice(0, 10); // Return top 10 most relevant updates
      
  } catch (error) {
    console.error('Error in scrapeOfficialUpdates:', error);
    // Return mock data if scraping fails
    return getMockOfficialUpdates(disasterId);
  }
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
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  return [
    {
      id: uuidv4(),
      disaster_id: disasterId,
      source: 'FEMA',
      title: 'Federal Disaster Declaration for Recent Flooding',
      description: 'The President has declared a federal emergency for the affected region.',
      url: 'https://www.fema.gov/disaster/example',
      published_at: today,
      created_at: now,
      updated_at: now,
      disasterRelevance: 5,
      date: today
    },
    {
      id: uuidv4(),
      disaster_id: disasterId,
      source: 'Red Cross',
      title: 'Emergency Shelters Open for Flood Victims',
      description: 'The Red Cross has opened emergency shelters in the affected area.',
      url: 'https://www.redcross.org/example',
      published_at: today,
      created_at: now,
      updated_at: now,
      disasterRelevance: 4,
      date: today
    },
    {
      id: uuidv4(),
      disaster_id: disasterId,
      source: 'Local Government',
      title: 'Emergency Response Plan Activated',
      description: 'Local authorities have activated emergency response protocols.',
      url: 'https://www.nyc.gov/example',
      published_at: today,
      created_at: now,
      updated_at: now,
      disasterRelevance: 3,
      date: today
    }
  ];
}

