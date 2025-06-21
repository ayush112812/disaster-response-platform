const axios = require('axios');
const config = require('../config');
const db = require('./db.service');

class SocialService {
  constructor() {
    this.twitterEnabled = !!config.twitter?.bearerToken;
  }

  async getDisasterSocialMedia(disasterId, disasterKeywords = [], limit = 20) {
    try {
      // Check cache first
      const cacheKey = `social:${disasterId}`;
      const cached = await db.getFromCache(cacheKey);
      if (cached) return cached;

      let posts = [];
      
      // Try Twitter API if configured
      if (this.twitterEnabled) {
        try {
          const twitterPosts = await this._getTwitterPosts(disasterKeywords, limit);
          posts = posts.concat(twitterPosts);
        } catch (error) {
          console.error('Error fetching from Twitter:', error.message);
          // Fall through to mock data
        }
      }
      
      // If no posts from Twitter or Twitter failed, use mock data
      if (posts.length === 0) {
        posts = this._getMockSocialMediaPosts(disasterKeywords, limit);
      }
      
      // Cache the results
      await db.setCache(cacheKey, posts);
      
      return posts;
      
    } catch (error) {
      console.error('Error in social media service:', error);
      // Return mock data as fallback
      return this._getMockSocialMediaPosts(disasterKeywords, limit);
    }
  }

  async _getTwitterPosts(keywords, limit) {
    if (!this.twitterEnabled) return [];
    
    try {
      const query = this._buildTwitterQuery(keywords);
      const url = 'https://api.twitter.com/2/tweets/search/recent';
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${config.twitter.bearerToken}`
        },
        params: {
          query,
          'tweet.fields': 'created_at,author_id,public_metrics',
          'user.fields': 'name,username,profile_image_url',
          'expansions': 'author_id',
          max_results: Math.min(limit, 100)
        }
      });
      
      // Transform Twitter API response to our format
      const users = response.data.includes?.users || [];
      const userMap = users.reduce((acc, user) => ({
        ...acc,
        [user.id]: user
      }), {});
      
      return response.data.data?.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at,
        user: {
          id: tweet.author_id,
          name: userMap[tweet.author_id]?.name || 'Unknown',
          username: userMap[tweet.author_id]?.username || 'unknown',
          profileImage: userMap[tweet.author_id]?.profile_image_url
        },
        metrics: tweet.public_metrics,
        platform: 'twitter',
        url: `https://twitter.com/${tweet.author_id}/status/${tweet.id}`
      })) || [];
      
    } catch (error) {
      console.error('Twitter API error:', error.response?.data || error.message);
      throw error;
    }
  }

  _buildTwitterQuery(keywords) {
    // Simple query builder that combines keywords with OR
    const queryTerms = keywords.map(k => `"${k}"`).join(' OR ');
    return `(${queryTerms}) -is:retweet -is:reply -is:quote lang:en`;
  }

  _getMockSocialMediaPosts(keywords = [], limit = 20) {
    // Generate mock social media posts for testing
    const mockUsers = [
      { id: 'user1', name: 'Local Resident', username: 'local_resident', profileImage: 'https://i.pravatar.cc/150?img=1' },
      { id: 'user2', name: 'Emergency Services', username: 'emergency_services', profileImage: 'https://i.pravatar.cc/150?img=2' },
      { id: 'user3', name: 'Volunteer', username: 'volunteer_help', profileImage: 'https://i.pravatar.cc/150?img=3' },
      { id: 'user4', name: 'News Outlet', username: 'local_news', profileImage: 'https://i.pravatar.cc/150?img=4' },
      { id: 'user5', name: 'Government Official', username: 'gov_official', profileImage: 'https://i.pravatar.cc/150?img=5' },
    ];

    const mockPosts = [
      `Urgent: ${keywords[0] || 'Flood'} situation worsening in downtown area. People need immediate assistance. #DisasterRelief`,
      `We've set up an emergency shelter at the community center. Food and water available. #EmergencyResponse`,
      `Avoid Main Street area due to ${keywords[0] || 'flooding'}. Roads are blocked. #StaySafe`,
      `Volunteers needed at the Red Cross shelter. Please DM if you can help. #Volunteer`,
      `Power outage in the northern district. Crews are working to restore. #PowerOutage`,
      `Latest update: ${keywords[0] || 'The disaster'} has affected over 10,000 residents. Stay tuned for more info.`,
      `Medical supplies being distributed at the high school. Bring ID. #EmergencyAid`,
      `Water levels are rising near the river. Evacuation orders in place. #FloodWarning`,
      `Donations needed: blankets, water, non-perishable food. Drop off at the fire station. #Donate`,
      `Emergency hotline for ${keywords[0] || 'disaster'} assistance: 1-800-XXX-XXXX #HelpLine`
    ];

    return Array.from({ length: Math.min(limit, 10) }, (_, i) => {
      const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      const text = mockPosts[Math.floor(Math.random() * mockPosts.length)];
      const hoursAgo = Math.floor(Math.random() * 24);
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - hoursAgo);
      
      return {
        id: `mock_${i}`,
        text,
        createdAt: createdAt.toISOString(),
        user,
        metrics: {
          like_count: Math.floor(Math.random() * 1000),
          retweet_count: Math.floor(Math.random() * 100),
          reply_count: Math.floor(Math.random() * 50),
          quote_count: Math.floor(Math.random() * 20)
        },
        platform: 'mock',
        url: '#'
      };
    });
  }
}

module.exports = new SocialService();
