import { 
  Title, 
  Text, 
  Container, 
  Card, 
  Group, 
  Badge, 
  Stack,
  LoadingOverlay,
  ActionIcon,
  Tooltip,
  Button,
  Grid,
  Alert,
  Tabs,
  Paper,
  Progress,
  RingProgress,
  SimpleGrid,
  Timeline,
  ThemeIcon
} from '@mantine/core';
import { 
  IconActivity, 
  IconRefresh, 
  IconAlertTriangle,
  IconBolt,
  IconCloudRain,
  IconUsers,
  IconNews,
  IconTrendingUp,
  IconMapPin,
  IconClock,
  IconShield,
  IconDatabase,
  IconWifi
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

// Types for real-time data
interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  area: string;
  coordinates: { lat: number; lng: number };
  effective: string;
  expires: string;
  source: string;
  urgency: string;
}

interface EarthquakeEvent {
  id: string;
  magnitude: number;
  location: string;
  coordinates: { lat: number; lng: number };
  depth: number;
  time: string;
  source: string;
  significance: number;
  tsunami: boolean;
}

interface SocialMediaAlert {
  id: string;
  platform: string;
  content: string;
  author: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  timestamp: string;
  urgencyScore: number;
  type: string;
  verified: boolean;
}

interface NewsAlert {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  category: string;
  severity: string;
}

interface RealTimeData {
  weatherAlerts: WeatherAlert[];
  earthquakes: EarthquakeEvent[];
  socialMediaAlerts: SocialMediaAlert[];
  newsAlerts: NewsAlert[];
  lastUpdated: string;
  totalAlerts: number;
  highPriorityCount: number;
}

interface RealTimeStats {
  totalAlerts: number;
  highPriorityCount: number;
  breakdown: {
    weatherAlerts: number;
    earthquakes: number;
    socialMediaAlerts: number;
    newsAlerts: number;
  };
  severityBreakdown: any;
  lastUpdated: string;
  dataFreshness: number;
}

function RealTimeDashboard() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [realtimeData, setRealtimeData] = useState<RealTimeData | null>(null);
  const { socket, connected } = useWebSocket();

  // Generate mock real-time data
  const generateMockData = (): RealTimeData => {
    const now = new Date();
    return {
      weatherAlerts: [
        {
          id: `weather_${Date.now()}_1`,
          title: 'Flash Flood Warning',
          description: 'Flash flooding is occurring or imminent in the warned area. Move to higher ground immediately.',
          severity: 'severe',
          area: 'New York City, NY',
          coordinates: { lat: 40.7128, lng: -74.0060 },
          effective: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
          expires: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
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
          effective: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
          expires: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
          source: 'NOAA',
          urgency: 'expected'
        }
      ],
      earthquakes: [
        {
          id: `earthquake_${Date.now()}_1`,
          magnitude: 4.2,
          location: '15km NE of San Francisco, CA',
          coordinates: { lat: 37.7749, lng: -122.4194 },
          depth: 8.5,
          time: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
          source: 'USGS',
          significance: 250,
          tsunami: false
        },
        {
          id: `earthquake_${Date.now()}_2`,
          magnitude: 3.1,
          location: '22km SW of Los Angeles, CA',
          coordinates: { lat: 34.0522, lng: -118.2437 },
          depth: 12.3,
          time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          source: 'USGS',
          significance: 120,
          tsunami: false
        }
      ],
      socialMediaAlerts: [
        {
          id: `social_${Date.now()}_1`,
          platform: 'twitter',
          content: 'URGENT: Major flooding on Highway 101. Road completely impassable. Seek alternate routes immediately! #FloodAlert #Emergency',
          author: 'EmergencyUpdates',
          location: 'Highway 101, CA',
          coordinates: { lat: 37.4419, lng: -122.1430 },
          timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
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
          timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
          urgencyScore: 4,
          type: 'offer',
          verified: false
        }
      ],
      newsAlerts: [
        {
          id: `news_${Date.now()}_1`,
          title: 'Emergency Shelters Opened as Hurricane Approaches Gulf Coast',
          description: 'Local authorities have opened emergency shelters in preparation for Hurricane approaching the Gulf Coast.',
          source: 'Emergency Management Agency',
          url: 'https://example.com/hurricane-shelters',
          publishedAt: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
          location: 'Gulf Coast, FL',
          coordinates: { lat: 27.7663, lng: -82.6404 },
          category: 'emergency',
          severity: 'high'
        }
      ],
      lastUpdated: now.toISOString(),
      totalAlerts: 0,
      highPriorityCount: 0
    };
  };

  // Fetch real-time data from backend API
  const {
    data: initialData,
    isLoading,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['realtime-data'],
    queryFn: async () => {
      const response = await fetch('/api/realtime/data');
      if (!response.ok) throw new Error('Failed to fetch real-time data');
      const result = await response.json();
      return result.data;
    },
    retry: 3,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch real-time statistics
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['realtime-stats'],
    queryFn: async () => {
      const response = await fetch('/api/realtime/stats');
      if (!response.ok) throw new Error('Failed to fetch statistics');
      return response.json();
    },
    retry: 1,
    refetchInterval: 30000,
  });

  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Setting up WebSocket listeners for real-time dashboard');

    socket.on('real_time_data_update', (data: RealTimeData) => {
      console.log('📊 Received real-time data update:', data);
      setRealtimeData(data);
      refetchStats();
    });

    return () => {
      socket.off('real_time_data_update');
    };
  }, [socket, refetchStats]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing real-time data');
      refetch();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  // Use real-time data if available, otherwise use initial data
  const currentData = realtimeData || initialData;

  // Calculate totals if not already calculated
  if (currentData && (currentData.totalAlerts === 0 || !currentData.totalAlerts)) {
    currentData.totalAlerts =
      (currentData.weatherAlerts?.length || 0) +
      (currentData.earthquakes?.length || 0) +
      (currentData.socialMediaAlerts?.length || 0) +
      (currentData.newsAlerts?.length || 0);

    currentData.highPriorityCount =
      (currentData.weatherAlerts?.filter(a => a.severity === 'severe' || a.severity === 'extreme').length || 0) +
      (currentData.earthquakes?.filter(e => e.magnitude >= 4.0).length || 0) +
      (currentData.socialMediaAlerts?.filter(s => s.urgencyScore >= 4).length || 0) +
      (currentData.newsAlerts?.filter(n => n.severity === 'high').length || 0);
  }

  const handleRefresh = async () => {
    try {
      const response = await fetch('/api/realtime/refresh', { method: 'POST' });
      if (response.ok) {
        refetch();
        refetchStats();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme':
      case 'critical':
      case 'high':
        return 'red';
      case 'severe':
      case 'medium':
        return 'orange';
      case 'moderate':
        return 'yellow';
      default:
        return 'blue';
    }
  };

  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude >= 7.0) return 'red';
    if (magnitude >= 5.0) return 'orange';
    if (magnitude >= 3.0) return 'yellow';
    return 'blue';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Real-Time Disaster Dashboard</Title>
          <Text c="dimmed" size="lg">
            Live data aggregation from multiple sources
          </Text>
        </div>
        <Group>
          {connected && (
            <Badge color="green" variant="light" size="lg" leftSection={<IconWifi size={14} />}>
              Live
            </Badge>
          )}
          <Badge color="blue" variant="light" size="lg">
            {currentData?.totalAlerts || 0} Total Alerts
          </Badge>
          <Badge color="red" variant="filled" size="lg">
            {currentData?.highPriorityCount || 0} High Priority
          </Badge>
          <Tooltip label="Refresh all data">
            <ActionIcon 
              variant="light" 
              size="lg"
              onClick={handleRefresh}
              loading={isRefetching}
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* System Status */}
      <Alert color="blue" variant="light" mb="xl" icon={<IconDatabase size={16} />}>
        <Group justify="space-between">
          <Text size="sm">
            <strong>System Status:</strong> {connected ? 'Connected' : 'Disconnected'} • 
            Last Updated: {currentData?.lastUpdated ? formatTimeAgo(currentData.lastUpdated) : 'Never'}
          </Text>
          {stats && (
            <Text size="sm">
              Data Freshness: {Math.round((stats.dataFreshness || 0) / 1000)}s
            </Text>
          )}
        </Group>
      </Alert>

      {isLoading && !currentData ? (
        <div style={{ position: 'relative', minHeight: 400 }}>
          <LoadingOverlay visible />
        </div>
      ) : (
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconActivity size={16} />}>
              Overview
            </Tabs.Tab>
            <Tabs.Tab value="weather" leftSection={<IconCloudRain size={16} />}>
              Weather Alerts ({currentData?.weatherAlerts?.length || 0})
            </Tabs.Tab>
            <Tabs.Tab value="earthquakes" leftSection={<IconBolt size={16} />}>
              Earthquakes ({currentData?.earthquakes?.length || 0})
            </Tabs.Tab>
            <Tabs.Tab value="social" leftSection={<IconUsers size={16} />}>
              Social Media ({currentData?.socialMediaAlerts?.length || 0})
            </Tabs.Tab>
            <Tabs.Tab value="news" leftSection={<IconNews size={16} />}>
              News Alerts ({currentData?.newsAlerts?.length || 0})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview">
            <Grid mt="md">
              {/* Statistics Cards */}
              <Grid.Col span={{ base: 12, md: 3 }}>
                <Card withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        Total Alerts
                      </Text>
                      <Text fw={700} size="xl">
                        {currentData?.totalAlerts || 0}
                      </Text>
                    </div>
                    <ThemeIcon color="blue" variant="light" size="xl" radius="md">
                      <IconActivity size={28} />
                    </ThemeIcon>
                  </Group>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 3 }}>
                <Card withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        High Priority
                      </Text>
                      <Text fw={700} size="xl" c="red">
                        {currentData?.highPriorityCount || 0}
                      </Text>
                    </div>
                    <ThemeIcon color="red" variant="light" size="xl" radius="md">
                      <IconAlertTriangle size={28} />
                    </ThemeIcon>
                  </Group>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 3 }}>
                <Card withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        Weather Alerts
                      </Text>
                      <Text fw={700} size="xl" c="orange">
                        {currentData?.weatherAlerts?.length || 0}
                      </Text>
                    </div>
                    <ThemeIcon color="orange" variant="light" size="xl" radius="md">
                      <IconCloudRain size={28} />
                    </ThemeIcon>
                  </Group>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 3 }}>
                <Card withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        Earthquakes
                      </Text>
                      <Text fw={700} size="xl" c="yellow">
                        {currentData?.earthquakes?.length || 0}
                      </Text>
                    </div>
                    <ThemeIcon color="yellow" variant="light" size="xl" radius="md">
                      <IconBolt size={28} />
                    </ThemeIcon>
                  </Group>
                </Card>
              </Grid.Col>
            </Grid>

            {/* Recent Activity Timeline */}
            <Card mt="xl">
              <Title order={3} mb="md">Recent Activity</Title>
              <Timeline active={-1} bulletSize={24} lineWidth={2}>
                {currentData?.weatherAlerts?.slice(0, 3).map((alert) => (
                  <Timeline.Item
                    key={alert.id}
                    bullet={<ThemeIcon color={getSeverityColor(alert.severity)} size={24} radius="xl">
                      <IconCloudRain size={14} />
                    </ThemeIcon>}
                    title={alert.title}
                  >
                    <Text size="sm" c="dimmed">{alert.area}</Text>
                    <Text size="xs" c="dimmed">{formatTimeAgo(alert.effective)}</Text>
                  </Timeline.Item>
                ))}
                
                {currentData?.earthquakes?.slice(0, 2).map((eq) => (
                  <Timeline.Item
                    key={eq.id}
                    bullet={<ThemeIcon color={getMagnitudeColor(eq.magnitude)} size={24} radius="xl">
                      <IconBolt size={14} />
                    </ThemeIcon>}
                    title={`M${eq.magnitude} Earthquake`}
                  >
                    <Text size="sm" c="dimmed">{eq.location}</Text>
                    <Text size="xs" c="dimmed">{formatTimeAgo(eq.time)}</Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          </Tabs.Panel>

          {/* Weather Alerts Tab */}
          <Tabs.Panel value="weather">
            <Stack mt="md">
              {currentData?.weatherAlerts?.length ? (
                currentData.weatherAlerts.map((alert) => (
                  <Alert
                    key={alert.id}
                    color={getSeverityColor(alert.severity)}
                    title={alert.title}
                    icon={<IconCloudRain size={16} />}
                  >
                    <Text size="sm" mb="xs">{alert.description}</Text>
                    <Group gap="xs">
                      <Badge size="xs" color={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <Badge size="xs" variant="outline">
                        {alert.source}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        <IconMapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {alert.area}
                      </Text>
                      <Text size="xs" c="dimmed">
                        <IconClock size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {formatTimeAgo(alert.effective)}
                      </Text>
                    </Group>
                  </Alert>
                ))
              ) : (
                <Text ta="center" c="dimmed" py="xl">
                  No weather alerts at this time
                </Text>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Earthquakes Tab */}
          <Tabs.Panel value="earthquakes">
            <Stack mt="md">
              {currentData?.earthquakes?.length ? (
                currentData.earthquakes.map((eq) => (
                  <Card key={eq.id} withBorder>
                    <Group justify="space-between" mb="xs">
                      <Group>
                        <Badge size="lg" color={getMagnitudeColor(eq.magnitude)}>
                          M{eq.magnitude}
                        </Badge>
                        <Text fw={500}>{eq.location}</Text>
                      </Group>
                      <Text size="sm" c="dimmed">{formatTimeAgo(eq.time)}</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="sm">
                        <strong>Depth:</strong> {eq.depth}km
                      </Text>
                      <Text size="sm">
                        <strong>Significance:</strong> {eq.significance}
                      </Text>
                      {eq.tsunami && (
                        <Badge color="red" size="xs">TSUNAMI RISK</Badge>
                      )}
                      <Badge size="xs" variant="outline">{eq.source}</Badge>
                    </Group>
                  </Card>
                ))
              ) : (
                <Text ta="center" c="dimmed" py="xl">
                  No recent earthquakes
                </Text>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Social Media Tab */}
          <Tabs.Panel value="social">
            <Stack mt="md">
              {currentData?.socialMediaAlerts?.length ? (
                currentData.socialMediaAlerts.map((alert) => (
                  <Card key={alert.id} withBorder>
                    <Group justify="space-between" mb="xs">
                      <Group>
                        <Badge size="sm" color={alert.verified ? 'green' : 'gray'}>
                          {alert.platform}
                        </Badge>
                        <Text fw={500} size="sm">@{alert.author}</Text>
                      </Group>
                      <Group gap="xs">
                        <Badge size="xs" color={alert.urgencyScore >= 4 ? 'red' : 'blue'}>
                          Urgency: {alert.urgencyScore}/6
                        </Badge>
                        <Text size="xs" c="dimmed">{formatTimeAgo(alert.timestamp)}</Text>
                      </Group>
                    </Group>
                    <Text size="sm" mb="xs">{alert.content}</Text>
                    <Group gap="xs">
                      <Badge size="xs" variant="outline">{alert.type}</Badge>
                      {alert.verified && (
                        <Badge size="xs" color="green">VERIFIED</Badge>
                      )}
                      {alert.location && (
                        <Text size="xs" c="dimmed">
                          <IconMapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {alert.location}
                        </Text>
                      )}
                    </Group>
                  </Card>
                ))
              ) : (
                <Text ta="center" c="dimmed" py="xl">
                  No social media alerts
                </Text>
              )}
            </Stack>
          </Tabs.Panel>

          {/* News Alerts Tab */}
          <Tabs.Panel value="news">
            <Stack mt="md">
              {currentData?.newsAlerts?.length ? (
                currentData.newsAlerts.map((news) => (
                  <Card key={news.id} withBorder>
                    <Group justify="space-between" mb="xs">
                      <Text fw={500} size="lg">{news.title}</Text>
                      <Text size="sm" c="dimmed">{formatTimeAgo(news.publishedAt)}</Text>
                    </Group>
                    <Text size="sm" mb="xs" c="dimmed">{news.description}</Text>
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Badge size="xs" color={getSeverityColor(news.severity)}>
                          {news.severity.toUpperCase()}
                        </Badge>
                        <Badge size="xs" variant="outline">{news.category}</Badge>
                        <Badge size="xs" variant="light">{news.source}</Badge>
                        {news.location && (
                          <Text size="xs" c="dimmed">
                            <IconMapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                            {news.location}
                          </Text>
                        )}
                      </Group>
                      <Button
                        size="xs"
                        variant="light"
                        component="a"
                        href={news.url}
                        target="_blank"
                        rightSection={<IconTrendingUp size={12} />}
                      >
                        Read More
                      </Button>
                    </Group>
                  </Card>
                ))
              ) : (
                <Text ta="center" c="dimmed" py="xl">
                  No news alerts
                </Text>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      )}
    </Container>
  );
}

export default RealTimeDashboard;
