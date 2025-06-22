import axios from 'axios';

// Types for different data sources
export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  area: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  effective: string;
  expires: string;
  source: 'NWS' | 'NOAA';
  urgency: 'immediate' | 'expected' | 'future';
}

export interface EarthquakeEvent {
  id: string;
  magnitude: number;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  depth: number;
  time: string;
  source: 'USGS';
  significance: number;
  tsunami: boolean;
}

export interface SocialMediaAlert {
  id: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'reddit';
  content: string;
  author: string;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  urgencyScore: number;
  type: 'need' | 'offer' | 'alert' | 'general';
  verified: boolean;
}

export interface NewsAlert {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  category: 'emergency' | 'weather' | 'earthquake' | 'fire' | 'flood' | 'general';
  severity: 'low' | 'medium' | 'high';
}

export interface AggregatedData {
  weatherAlerts: WeatherAlert[];
  earthquakes: EarthquakeEvent[];
  socialMediaAlerts: SocialMediaAlert[];
  newsAlerts: NewsAlert[];
  lastUpdated: string;
  totalAlerts: number;
  highPriorityCount: number;
}

class RealTimeDataAggregator {
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly UPDATE_FREQUENCY = 30000; // 30 seconds
  private latestData: AggregatedData | null = null;

  constructor() {
    this.startAggregation();
  }

  public startAggregation(): void {
    if (this.isRunning) return;
    
    console.log('🔄 Starting real-time data aggregation...');
    this.isRunning = true;
    
    // Initial fetch
    this.aggregateAllData();
    
    // Set up periodic updates
    this.updateInterval = setInterval(() => {
      this.aggregateAllData();
    }, this.UPDATE_FREQUENCY);
  }

  public stopAggregation(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Stopped real-time data aggregation');
  }

  private async aggregateAllData(): Promise<void> {
    try {
      console.log('📊 Aggregating real-time data from all sources...');
      
      const [weatherAlerts, earthquakes, socialMediaAlerts, newsAlerts] = await Promise.allSettled([
        this.fetchWeatherAlerts(),
        this.fetchEarthquakeData(),
        this.fetchSocialMediaAlerts(),
        this.fetchNewsAlerts()
      ]);

      const aggregatedData: AggregatedData = {
        weatherAlerts: weatherAlerts.status === 'fulfilled' ? weatherAlerts.value : [],
        earthquakes: earthquakes.status === 'fulfilled' ? earthquakes.value : [],
        socialMediaAlerts: socialMediaAlerts.status === 'fulfilled' ? socialMediaAlerts.value : [],
        newsAlerts: newsAlerts.status === 'fulfilled' ? newsAlerts.value : [],
        lastUpdated: new Date().toISOString(),
        totalAlerts: 0,
        highPriorityCount: 0
      };

      // Calculate totals
      aggregatedData.totalAlerts = 
        aggregatedData.weatherAlerts.length +
        aggregatedData.earthquakes.length +
        aggregatedData.socialMediaAlerts.length +
        aggregatedData.newsAlerts.length;

      aggregatedData.highPriorityCount = 
        aggregatedData.weatherAlerts.filter(a => a.severity === 'severe' || a.severity === 'extreme').length +
        aggregatedData.earthquakes.filter(e => e.magnitude >= 5.0).length +
        aggregatedData.socialMediaAlerts.filter(s => s.urgencyScore >= 4).length +
        aggregatedData.newsAlerts.filter(n => n.severity === 'high').length;

      // Store in cache/database
      await this.storeAggregatedData(aggregatedData);

      // Store the data for API access
      this.latestData = aggregatedData;

      console.log(`✅ Data aggregation complete: ${aggregatedData.totalAlerts} total alerts, ${aggregatedData.highPriorityCount} high priority`);

    } catch (error) {
      console.error('❌ Error during data aggregation:', error);
    }
  }

  private async fetchWeatherAlerts(): Promise<WeatherAlert[]> {
    try {
      // Mock weather alerts for demo - in production, integrate with NWS/NOAA APIs
      const mockAlerts: WeatherAlert[] = [
        {
          id: `weather_${Date.now()}_1`,
          title: 'Flash Flood Warning',
          description: 'Flash flooding is occurring or imminent in the warned area. Move to higher ground immediately.',
          severity: 'severe',
          area: 'New York City, NY',
          coordinates: { lat: 40.7128, lng: -74.0060 },
          effective: new Date().toISOString(),
          expires: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          source: 'NWS',
          urgency: 'immediate'
        },
        {
          id: `weather_${Date.now()}_2`,
          title: 'Severe Thunderstorm Watch',
          description: 'Conditions are favorable for severe thunderstorms with damaging winds and large hail.',
          severity: 'moderate',
          area: 'Los Angeles County, CA',
          coordinates: { lat: 34.0522, lng: -118.2437 },
          effective: new Date().toISOString(),
          expires: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          source: 'NOAA',
          urgency: 'expected'
        }
      ];

      return mockAlerts;
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
      return [];
    }
  }

  private async fetchEarthquakeData(): Promise<EarthquakeEvent[]> {
    try {
      // Integrate with USGS Earthquake API
      const response = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson', {
        timeout: 10000
      });

      const earthquakes: EarthquakeEvent[] = response.data.features
        .filter((feature: any) => feature.properties.mag >= 2.0) // Only significant earthquakes
        .map((feature: any) => ({
          id: feature.id,
          magnitude: feature.properties.mag,
          location: feature.properties.place,
          coordinates: {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0]
          },
          depth: feature.geometry.coordinates[2],
          time: new Date(feature.properties.time).toISOString(),
          source: 'USGS',
          significance: feature.properties.sig || 0,
          tsunami: feature.properties.tsunami === 1
        }));

      return earthquakes;
    } catch (error) {
      console.error('Error fetching earthquake data:', error);
      // Return mock data as fallback
      return [
        {
          id: `earthquake_${Date.now()}`,
          magnitude: 3.2,
          location: '15km NE of San Francisco, CA',
          coordinates: { lat: 37.7749, lng: -122.4194 },
          depth: 8.5,
          time: new Date().toISOString(),
          source: 'USGS',
          significance: 150,
          tsunami: false
        }
      ];
    }
  }

  private async fetchSocialMediaAlerts(): Promise<SocialMediaAlert[]> {
    try {
      // Mock social media alerts - in production, integrate with social media APIs
      const mockAlerts: SocialMediaAlert[] = [
        {
          id: `social_${Date.now()}_1`,
          platform: 'twitter',
          content: 'URGENT: Major flooding on Highway 101. Road completely impassable. Seek alternate routes immediately! #FloodAlert #Emergency',
          author: '@EmergencyUpdates',
          location: 'Highway 101, CA',
          coordinates: { lat: 37.4419, lng: -122.1430 },
          timestamp: new Date().toISOString(),
          urgencyScore: 5,
          type: 'alert',
          verified: true
        },
        {
          id: `social_${Date.now()}_2`,
          platform: 'facebook',
          content: 'Need help evacuating elderly residents from downtown area. Have transportation available. Please contact if you need assistance.',
          author: 'Local Volunteer Group',
          location: 'Downtown Miami, FL',
          coordinates: { lat: 25.7617, lng: -80.1918 },
          timestamp: new Date().toISOString(),
          urgencyScore: 4,
          type: 'offer',
          verified: false
        }
      ];

      return mockAlerts;
    } catch (error) {
      console.error('Error fetching social media alerts:', error);
      return [];
    }
  }

  private async fetchNewsAlerts(): Promise<NewsAlert[]> {
    try {
      // Mock news alerts - in production, integrate with news APIs
      const mockAlerts: NewsAlert[] = [
        {
          id: `news_${Date.now()}_1`,
          title: 'Emergency Shelters Opened as Hurricane Approaches Gulf Coast',
          description: 'Local authorities have opened emergency shelters in preparation for Hurricane approaching the Gulf Coast. Residents in evacuation zones are urged to leave immediately.',
          source: 'Emergency Management Agency',
          url: 'https://example.com/hurricane-shelters',
          publishedAt: new Date().toISOString(),
          location: 'Gulf Coast, FL',
          coordinates: { lat: 27.7663, lng: -82.6404 },
          category: 'emergency',
          severity: 'high'
        },
        {
          id: `news_${Date.now()}_2`,
          title: 'Wildfire Containment Efforts Continue in Northern California',
          description: 'Firefighters are making progress containing the wildfire that has burned over 10,000 acres in Northern California.',
          source: 'Cal Fire',
          url: 'https://example.com/wildfire-update',
          publishedAt: new Date().toISOString(),
          location: 'Northern California',
          coordinates: { lat: 39.1612, lng: -121.6077 },
          category: 'fire',
          severity: 'medium'
        }
      ];

      return mockAlerts;
    } catch (error) {
      console.error('Error fetching news alerts:', error);
      return [];
    }
  }

  private async storeAggregatedData(data: AggregatedData): Promise<void> {
    try {
      // Store in memory for now (simplified version)
      this.latestData = data;
      console.log('✅ Data stored in memory cache');
    } catch (error) {
      console.error('Error storing aggregated data:', error);
    }
  }

  public async getLatestData(): Promise<AggregatedData | null> {
    try {
      // Return from memory cache
      return this.latestData;
    } catch (error) {
      console.error('Error retrieving latest data:', error);
      return null;
    }
  }
}

// Export singleton instance
export const realTimeDataAggregator = new RealTimeDataAggregator();
export default realTimeDataAggregator;
