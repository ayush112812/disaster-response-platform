const axios = require('axios');
const cheerio = require('cheerio');
const db = require('./db.service');

class UpdatesService {
  constructor() {
    this.sources = [
      {
        name: 'FEMA',
        url: 'https://www.fema.gov/disaster/updates',
        selector: '.view-disaster-updates .views-row',
        title: 'h3',
        date: '.date',
        summary: '.field-content',
        link: 'a',
        baseUrl: 'https://www.fema.gov'
      },
      {
        name: 'Red Cross',
        url: 'https://www.redcross.org/about-us/news-and-events/news.html',
        selector: '.news-item',
        title: 'h4',
        date: '.date',
        summary: 'p',
        link: 'a',
        baseUrl: 'https://www.redcross.org'
      },
      {
        name: 'ReliefWeb',
        url: 'https://reliefweb.int/updates',
        selector: '.rw-river-article--list',
        title: '.rw-river-article__title',
        date: '.rw-river-article__date',
        summary: '.rw-river-article__content',
        link: 'a',
        baseUrl: 'https://reliefweb.int'
      }
    ];
  }


  async getOfficialUpdates(disasterKeywords = [], limit = 10) {
    try {
      // Check cache first
      const cacheKey = `updates:${disasterKeywords.join(',')}`;
      const cached = await db.getFromCache(cacheKey);
      if (cached) return cached;

      // Try to fetch from real sources
      let allUpdates = [];
      
      for (const source of this.sources) {
        try {
          const updates = await this._scrapeSource(source, disasterKeywords);
          allUpdates = [...allUpdates, ...updates];
          
          // If we have enough updates, break early
          if (allUpdates.length >= limit) {
            allUpdates = allUpdates.slice(0, limit);
            break;
          }
        } catch (error) {
          console.error(`Error scraping ${source.name}:`, error.message);
          // Continue to next source if one fails
        }
      }
      
      // If no updates from real sources, use mock data
      if (allUpdates.length === 0) {
        allUpdates = this._getMockUpdates(disasterKeywords, limit);
      }
      
      // Cache the results
      if (allUpdates.length > 0) {
        await db.setCache(cacheKey, allUpdates);
      }
      
      return allUpdates;
      
    } catch (error) {
      console.error('Error in updates service:', error);
      // Return mock data as fallback
      return this._getMockUpdates(disasterKeywords, limit);
    }
  }

  async _scrapeSource(source, keywords) {
    try {
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const updates = [];
      
      $(source.selector).each((i, element) => {
        try {
          const $el = $(element);
          const title = $el.find(source.title).text().trim();
          const date = $el.find(source.date).text().trim();
          const summary = $el.find(source.summary).text().trim();
          let link = $el.find(source.link).attr('href') || '';
          
          // Convert relative URLs to absolute
          if (link && !link.startsWith('http')) {
            link = new URL(link, source.baseUrl).href;
          }
          
          // Check if the update is relevant to our disaster keywords
          const content = `${title} ${summary}`.toLowerCase();
          const isRelevant = keywords.length === 0 || 
            keywords.some(keyword => content.includes(keyword.toLowerCase()));
          
          if (isRelevant) {
            updates.push({
              source: source.name,
              title,
              date: date || new Date().toISOString(),
              summary,
              link,
              isMock: false
            });
          }
          
        } catch (error) {
          console.error('Error parsing update:', error);
        }
      });
      
      return updates;
      
    } catch (error) {
      console.error(`Error scraping ${source.name}:`, error.message);
      return [];
    }
  }

  _getMockUpdates(keywords = [], limit = 10) {
    const disasterType = keywords[0] || 'disaster';
    const locations = ['Downtown', 'North District', 'Riverside', 'West End', 'East Side'];
    const sources = ['FEMA', 'Red Cross', 'Local Government', 'Emergency Services', 'Weather Service'];
    const updateTypes = [
      `New ${disasterType} alert issued`,
      `Emergency shelter opened`,
      `Road closures announced`,
      `Volunteers needed`,
      `Donation center established`,
      `Power outage update`,
      `Water safety advisory`,
      `Evacuation order lifted`,
      `Recovery efforts update`,
      `Community meeting scheduled`
    ];

    return Array.from({ length: Math.min(limit, 10) }, (_, i) => {
      const hoursAgo = Math.floor(Math.random() * 24);
      const date = new Date();
      date.setHours(date.getHours() - hoursAgo);
      
      const location = locations[Math.floor(Math.random() * locations.length)];
      const updateType = updateTypes[Math.floor(Math.random() * updateTypes.length)];
      
      return {
        source: sources[Math.floor(Math.random() * sources.length)],
        title: `${updateType} - ${location}`,
        date: date.toISOString(),
        summary: `This is a mock update about ${disasterType} in ${location}. ` +
                 `The situation is being monitored and updates will be provided as they become available. ` +
                 `Please follow all official instructions and stay safe.`,
        link: '#',
        isMock: true
      };
    });
  }
}

module.exports = new UpdatesService();
