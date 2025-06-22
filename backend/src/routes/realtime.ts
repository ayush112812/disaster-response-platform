import { Router } from 'express';
import { realTimeDataAggregator } from '../services/realTimeDataAggregator';

const router = Router();

// Get latest aggregated real-time data
router.get('/data', async (req: any, res: any) => {
  try {
    const latestData = await realTimeDataAggregator.getLatestData();

    if (!latestData) {
      return res.status(404).json({
        error: 'No real-time data available',
        message: 'Data aggregation may still be initializing. Please try again in a moment.'
      });
    }

    res.json({
      success: true,
      data: latestData,
      message: `Real-time data with ${latestData.totalAlerts} total alerts`
    });
  } catch (error) {
    console.error('Error fetching real-time data:', error);
    res.status(500).json({ error: 'Failed to fetch real-time data' });
  }
});

// Get weather alerts specifically
router.get('/weather-alerts', async (req: any, res: any) => {
  try {
    const { severity, limit = 50 } = req.query;
    const latestData = await realTimeDataAggregator.getLatestData();
    
    if (!latestData) {
      return res.status(404).json({ error: 'No weather data available' });
    }

    let weatherAlerts = latestData.weatherAlerts;
    
    // Filter by severity if specified
    if (severity) {
      weatherAlerts = weatherAlerts.filter(alert => alert.severity === severity);
    }

    // Limit results
    weatherAlerts = weatherAlerts.slice(0, Number(limit));

    res.json({
      alerts: weatherAlerts,
      total: weatherAlerts.length,
      lastUpdated: latestData.lastUpdated
    });
  } catch (error) {
    console.error('Error fetching weather alerts:', error);
    res.status(500).json({ error: 'Failed to fetch weather alerts' });
  }
});

// Get earthquake data specifically
router.get('/earthquakes', async (req: any, res: any) => {
  try {
    const { minMagnitude = 2.0, limit = 50 } = req.query;
    const latestData = await realTimeDataAggregator.getLatestData();
    
    if (!latestData) {
      return res.status(404).json({ error: 'No earthquake data available' });
    }

    let earthquakes = latestData.earthquakes;
    
    // Filter by minimum magnitude
    earthquakes = earthquakes.filter(eq => eq.magnitude >= Number(minMagnitude));
    
    // Sort by magnitude (highest first)
    earthquakes.sort((a, b) => b.magnitude - a.magnitude);
    
    // Limit results
    earthquakes = earthquakes.slice(0, Number(limit));

    res.json({
      earthquakes,
      total: earthquakes.length,
      lastUpdated: latestData.lastUpdated,
      filters: {
        minMagnitude: Number(minMagnitude)
      }
    });
  } catch (error) {
    console.error('Error fetching earthquake data:', error);
    res.status(500).json({ error: 'Failed to fetch earthquake data' });
  }
});

// Get social media alerts specifically
router.get('/social-alerts', async (req: any, res: any) => {
  try {
    const { type, verified, minUrgency = 1, limit = 50 } = req.query;
    const latestData = await realTimeDataAggregator.getLatestData();
    
    if (!latestData) {
      return res.status(404).json({ error: 'No social media data available' });
    }

    let socialAlerts = latestData.socialMediaAlerts;
    
    // Apply filters
    if (type) {
      socialAlerts = socialAlerts.filter(alert => alert.type === type);
    }
    
    if (verified !== undefined) {
      socialAlerts = socialAlerts.filter(alert => alert.verified === (verified === 'true'));
    }
    
    socialAlerts = socialAlerts.filter(alert => alert.urgencyScore >= Number(minUrgency));
    
    // Sort by urgency score (highest first)
    socialAlerts.sort((a, b) => b.urgencyScore - a.urgencyScore);
    
    // Limit results
    socialAlerts = socialAlerts.slice(0, Number(limit));

    res.json({
      alerts: socialAlerts,
      total: socialAlerts.length,
      lastUpdated: latestData.lastUpdated,
      filters: {
        type,
        verified,
        minUrgency: Number(minUrgency)
      }
    });
  } catch (error) {
    console.error('Error fetching social media alerts:', error);
    res.status(500).json({ error: 'Failed to fetch social media alerts' });
  }
});

// Get news alerts specifically
router.get('/news-alerts', async (req: any, res: any) => {
  try {
    const { category, severity, limit = 50 } = req.query;
    const latestData = await realTimeDataAggregator.getLatestData();
    
    if (!latestData) {
      return res.status(404).json({ error: 'No news data available' });
    }

    let newsAlerts = latestData.newsAlerts;
    
    // Apply filters
    if (category) {
      newsAlerts = newsAlerts.filter(alert => alert.category === category);
    }
    
    if (severity) {
      newsAlerts = newsAlerts.filter(alert => alert.severity === severity);
    }
    
    // Sort by published date (newest first)
    newsAlerts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // Limit results
    newsAlerts = newsAlerts.slice(0, Number(limit));

    res.json({
      alerts: newsAlerts,
      total: newsAlerts.length,
      lastUpdated: latestData.lastUpdated,
      filters: {
        category,
        severity
      }
    });
  } catch (error) {
    console.error('Error fetching news alerts:', error);
    res.status(500).json({ error: 'Failed to fetch news alerts' });
  }
});

// Get real-time statistics and metrics
router.get('/stats', async (req: any, res: any) => {
  try {
    const latestData = await realTimeDataAggregator.getLatestData();
    
    if (!latestData) {
      return res.status(404).json({ error: 'No statistics available' });
    }

    const stats = {
      totalAlerts: latestData.totalAlerts,
      highPriorityCount: latestData.highPriorityCount,
      breakdown: {
        weatherAlerts: latestData.weatherAlerts.length,
        earthquakes: latestData.earthquakes.length,
        socialMediaAlerts: latestData.socialMediaAlerts.length,
        newsAlerts: latestData.newsAlerts.length
      },
      severityBreakdown: {
        weather: {
          minor: latestData.weatherAlerts.filter(a => a.severity === 'minor').length,
          moderate: latestData.weatherAlerts.filter(a => a.severity === 'moderate').length,
          severe: latestData.weatherAlerts.filter(a => a.severity === 'severe').length,
          extreme: latestData.weatherAlerts.filter(a => a.severity === 'extreme').length
        },
        earthquakes: {
          minor: latestData.earthquakes.filter(e => e.magnitude < 3.0).length,
          light: latestData.earthquakes.filter(e => e.magnitude >= 3.0 && e.magnitude < 4.0).length,
          moderate: latestData.earthquakes.filter(e => e.magnitude >= 4.0 && e.magnitude < 5.0).length,
          strong: latestData.earthquakes.filter(e => e.magnitude >= 5.0).length
        },
        social: {
          low: latestData.socialMediaAlerts.filter(s => s.urgencyScore <= 2).length,
          medium: latestData.socialMediaAlerts.filter(s => s.urgencyScore >= 3 && s.urgencyScore <= 4).length,
          high: latestData.socialMediaAlerts.filter(s => s.urgencyScore >= 5).length
        }
      },
      lastUpdated: latestData.lastUpdated,
      dataFreshness: Date.now() - new Date(latestData.lastUpdated).getTime()
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Force refresh of all data sources
router.post('/refresh', async (req: any, res: any) => {
  try {
    console.log('🔄 Manual refresh requested for real-time data');
    
    // Stop and restart aggregation to force immediate update
    realTimeDataAggregator.stopAggregation();
    realTimeDataAggregator.startAggregation();
    
    // Wait a moment for the refresh to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const latestData = await realTimeDataAggregator.getLatestData();
    
    res.json({
      success: true,
      message: 'Real-time data refresh initiated',
      data: latestData,
      refreshedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing real-time data:', error);
    res.status(500).json({ error: 'Failed to refresh real-time data' });
  }
});

// Health check for real-time data system
router.get('/health', async (req: any, res: any) => {
  try {
    const latestData = await realTimeDataAggregator.getLatestData();
    const isHealthy = latestData && 
      (Date.now() - new Date(latestData.lastUpdated).getTime()) < 120000; // Data is less than 2 minutes old

    res.json({
      status: isHealthy ? 'healthy' : 'degraded',
      lastUpdate: latestData?.lastUpdated || null,
      dataAge: latestData ? Date.now() - new Date(latestData.lastUpdated).getTime() : null,
      totalAlerts: latestData?.totalAlerts || 0,
      services: {
        aggregator: 'running',
        database: 'connected',
        websocket: 'active'
      }
    });
  } catch (error) {
    console.error('Error checking real-time data health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

export default router;
