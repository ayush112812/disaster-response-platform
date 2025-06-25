import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Card,
  Badge,
  Alert,
  Tabs,
  Grid,
  Paper,
  ActionIcon,
  Tooltip,
  ThemeIcon,
  LoadingOverlay,
  Timeline
} from '@mantine/core';
import {
  IconDatabase,
  IconBrandTwitter,
  IconSocial,
  IconCheck,
  IconRefresh,
  IconRobot,
  IconUser,
  IconClock
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { DisasterReportForm } from '../components/DisasterReportForm';
import { api } from '../services/api';

interface IngestionStats {
  totalReports: number;
  userReports: number;
  socialMediaReports: number;
  verifiedDisasters: number;
  pendingReports: number;
  platforms: Record<string, number>;
  disasterTypes: Record<string, number>;
  lastIngestion: string;
}

export function DataIngestionPage() {
  const [activeTab, setActiveTab] = useState<string>('user-input');
  const [stats, setStats] = useState<IngestionStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await api.get('/ingestion/stats');
      setStats(response.data.stats);
    } catch (error) {
      // Fallback to mock stats
      const mockStats: IngestionStats = {
        totalReports: 156,
        userReports: 89,
        socialMediaReports: 67,
        verifiedDisasters: 34,
        pendingReports: 12,
        platforms: {
          twitter: 45,
          bluesky: 15,
          facebook: 5,
          instagram: 2
        },
        disasterTypes: {
          earthquake: 8,
          flood: 12,
          fire: 9,
          hurricane: 3,
          tornado: 2
        },
        lastIngestion: new Date().toISOString()
      };
      setStats(mockStats);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const triggerSocialMediaIngestion = async () => {
    setIsIngesting(true);
    try {
      const response = await api.post('/ingestion/ingest-social-media');
      notifications.show({
        title: 'Ingestion Started',
        message: 'Social media data ingestion has been triggered',
        color: 'green'
      });

      // Simulate some activity
      const mockActivity = [
        {
          id: 1,
          type: 'social_media',
          platform: 'twitter',
          content: 'Major earthquake detected in San Francisco area',
          timestamp: new Date().toISOString(),
          status: 'processed'
        },
        {
          id: 2,
          type: 'social_media',
          platform: 'bluesky',
          content: 'Flash flooding reported on Highway 101',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          status: 'processed'
        }
      ];
      setRecentActivity(mockActivity);

      // Refresh stats
      setTimeout(() => {
        loadStats();
      }, 2000);
      
    } catch (error) {
      notifications.show({
        title: 'Ingestion Failed',
        message: 'Failed to trigger social media ingestion',
        color: 'red'
      });
    } finally {
      setIsIngesting(false);
    }
  };

  const handleReportSubmitted = (disasterId: string) => {
    notifications.show({
      title: 'Success',
      message: `Disaster report submitted and processed (ID: ${disasterId})`,
      color: 'green'
    });

    // Add to recent activity
    const newActivity = {
      id: Date.now(),
      type: 'user_input',
      content: 'New disaster report submitted via form',
      timestamp: new Date().toISOString(),
      status: 'processed',
      disasterId
    };
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 4)]);

    // Refresh stats
    loadStats();
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">Disaster Data Ingestion</Title>
          <Text c="dimmed" size="lg">
            Core component for accepting disaster reports via user input and social media monitoring
          </Text>
        </div>

        {/* Statistics Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">Total Reports</Text>
                  <Text fw={700} size="xl">{stats?.totalReports || 0}</Text>
                </div>
                <ThemeIcon color="blue" variant="light" size="xl">
                  <IconDatabase size={20} />
                </ThemeIcon>
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">User Reports</Text>
                  <Text fw={700} size="xl">{stats?.userReports || 0}</Text>
                </div>
                <ThemeIcon color="green" variant="light" size="xl">
                  <IconUser size={20} />
                </ThemeIcon>
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">Social Media</Text>
                  <Text fw={700} size="xl">{stats?.socialMediaReports || 0}</Text>
                </div>
                <ThemeIcon color="orange" variant="light" size="xl">
                  <IconSocial size={20} />
                </ThemeIcon>
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">Verified</Text>
                  <Text fw={700} size="xl">{stats?.verifiedDisasters || 0}</Text>
                </div>
                <ThemeIcon color="teal" variant="light" size="xl">
                  <IconCheck size={20} />
                </ThemeIcon>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="user-input" leftSection={<IconUser size={16} />}>
              User Input Form
            </Tabs.Tab>
            <Tabs.Tab value="social-media" leftSection={<IconBrandTwitter size={16} />}>
              Social Media Ingestion
            </Tabs.Tab>
            <Tabs.Tab value="activity" leftSection={<IconClock size={16} />}>
              Recent Activity
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="user-input" pt="xl">
            <Grid>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <DisasterReportForm onReportSubmitted={handleReportSubmitted} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack gap="md">
                  <Alert color="blue" variant="light">
                    <Text size="sm" fw={500} mb="xs">How User Input Works:</Text>
                    <Text size="xs">
                      1. User submits disaster report via form<br/>
                      2. Text is analyzed for disaster content<br/>
                      3. Location is extracted using AI<br/>
                      4. Images are verified for authenticity<br/>
                      5. Disaster entry is automatically created
                    </Text>
                  </Alert>
                  
                  <Paper withBorder p="md">
                    <Text size="sm" fw={500} mb="xs">Example Reports:</Text>
                    <Stack gap="xs">
                      <Text size="xs" c="dimmed">"Major earthquake in San Francisco, buildings shaking"</Text>
                      <Text size="xs" c="dimmed">"Flash flood on Highway 101, cars stranded"</Text>
                      <Text size="xs" c="dimmed">"Wildfire near Napa Valley, evacuation needed"</Text>
                    </Stack>
                  </Paper>
                </Stack>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="social-media" pt="xl">
            <Grid>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Paper withBorder p="xl">
                  <Stack gap="lg">
                    <div>
                      <Title order={3} mb="xs">Social Media Monitoring</Title>
                      <Text c="dimmed">
                        Simulate ingesting disaster reports from Twitter, Bluesky, and other social media platforms
                      </Text>
                    </div>
                    
                    <Alert color="blue" variant="light">
                      <Text size="sm">
                        <strong>Mock Integration:</strong> This simulates connecting to Twitter/Bluesky APIs to monitor 
                        for disaster-related posts and automatically create disaster entries.
                      </Text>
                    </Alert>
                    
                    <Group>
                      <Button
                        leftSection={<IconRobot size={16} />}
                        onClick={triggerSocialMediaIngestion}
                        loading={isIngesting}
                        size="lg"
                      >
                        Trigger Social Media Ingestion
                      </Button>
                      
                      <Tooltip label="Refresh statistics">
                        <ActionIcon
                          variant="light"
                          onClick={loadStats}
                          loading={isLoadingStats}
                        >
                          <IconRefresh size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    
                    {stats && (
                      <div>
                        <Text size="sm" fw={500} mb="xs">Platform Breakdown:</Text>
                        <Group gap="xs">
                          {Object.entries(stats.platforms).map(([platform, count]) => (
                            <Badge key={platform} variant="light">
                              {platform}: {count}
                            </Badge>
                          ))}
                        </Group>
                      </div>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>
              
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper withBorder p="md">
                  <Text size="sm" fw={500} mb="xs">Disaster Types Detected:</Text>
                  <Stack gap="xs">
                    {stats && Object.entries(stats.disasterTypes).map(([type, count]) => (
                      <Group key={type} justify="space-between">
                        <Text size="sm" tt="capitalize">{type}</Text>
                        <Badge size="sm">{count}</Badge>
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="activity" pt="xl">
            <Paper withBorder p="xl">
              <div style={{ position: 'relative' }}>
                <LoadingOverlay visible={isLoadingStats} />

                <Title order={3} mb="lg">Recent Ingestion Activity</Title>

                {recentActivity.length > 0 ? (
                  <Timeline active={recentActivity.length} bulletSize={24} lineWidth={2}>
                    {recentActivity.map((activity, index) => (
                      <Timeline.Item
                        key={activity.id}
                        bullet={activity.type === 'user_input' ? <IconUser size={12} /> : <IconSocial size={12} />}
                        title={activity.content}
                      >
                        <Text c="dimmed" size="sm">
                          {activity.platform && `Platform: ${activity.platform}`}
                          {activity.disasterId && ` • Disaster ID: ${activity.disasterId}`}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {new Date(activity.timestamp).toLocaleString()}
                        </Text>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                ) : (
                  <Text c="dimmed" ta="center" py="xl">
                    No recent activity. Submit a report or trigger social media ingestion to see activity here.
                  </Text>
                )}
              </div>
            </Paper>
          </Tabs.Panel>

        </Tabs>
      </Stack>
    </Container>
  );
}

export default DataIngestionPage;
