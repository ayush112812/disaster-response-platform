import {
  Title,
  Text,
  Container,
  Card,
  Group,
  Badge,
  Stack,
  Alert,
  LoadingOverlay,
  ActionIcon,
  Tooltip,
  TextInput,
  Button,
  Grid,
  Select,
  Tabs
} from '@mantine/core';
import {
  IconBell,
  IconRefresh,
  IconSearch,
  IconAlertTriangle,
  IconUsers,
  IconClock,
  IconSos,
  IconGift,
  IconExclamationMark,
  IconFilter
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getMockSocialMediaPosts } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

// Helper function to get post type icon
const getPostTypeIcon = (type: string) => {
  switch (type) {
    case 'need':
      return <IconSos size={14} />;
    case 'offer':
      return <IconGift size={14} />;
    case 'alert':
      return <IconExclamationMark size={14} />;
    default:
      return <IconUsers size={14} />;
  }
};

// Helper function to get post type color
const getPostTypeColor = (type: string) => {
  switch (type) {
    case 'need':
      return 'red';
    case 'offer':
      return 'green';
    case 'alert':
      return 'orange';
    default:
      return 'gray';
  }
};

function SocialMediaPage() {
  const [searchKeywords, setSearchKeywords] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [realtimePosts, setRealtimePosts] = useState<any[]>([]);
  const { socket, connected } = useWebSocket();

  const {
    data: socialMedia,
    isLoading,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['social-media', searchKeywords],
    queryFn: () => getMockSocialMediaPosts(searchKeywords || undefined),
    retry: 1,
  });

  // WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Setting up WebSocket listeners for SocialMediaPage');

    // Listen for social media updates
    socket.on('social_media_global_update', (data: any) => {
      console.log('📱 Received social media update:', data);
      setRealtimePosts(data.posts || []);
    });

    // Listen for priority alerts
    socket.on('priority_alerts', (data: any) => {
      console.log('🚨 Received priority alerts:', data);
      // Merge priority alerts with existing posts
      setRealtimePosts(prev => {
        const alertPosts = data.alerts?.map((alert: any) => ({
          id: alert.id,
          username: alert.user || 'Alert',
          text: alert.content,
          content: alert.content,
          location: alert.location,
          timestamp: alert.timestamp,
          isPriority: true,
          isUrgent: true,
          platform: 'Alert System',
          urgencyScore: alert.urgencyScore
        })) || [];

        // Remove duplicates and merge
        const existingIds = new Set(prev.map(p => p.id));
        const newPosts = alertPosts.filter((p: any) => !existingIds.has(p.id));
        return [...newPosts, ...prev];
      });
    });

    return () => {
      socket.off('social_media_global_update');
      socket.off('priority_alerts');
    };
  }, [socket]);

  // Use realtime data if available, otherwise fallback to API data
  let allPosts = realtimePosts.length > 0 ? realtimePosts : socialMedia?.posts || [];

  // Apply type filter if selected
  if (typeFilter) {
    allPosts = allPosts.filter(p => p.type === typeFilter);
  }

  const priorityPosts = allPosts.filter(p => p.isPriority || p.isUrgent) || [];
  const regularPosts = allPosts.filter(p => !p.isPriority && !p.isUrgent) || [];

  // Calculate type counts for statistics
  const typeCounts = {
    need: allPosts.filter(p => p.type === 'need').length,
    offer: allPosts.filter(p => p.type === 'offer').length,
    alert: allPosts.filter(p => p.type === 'alert').length,
    general: allPosts.filter(p => p.type === 'general' || !p.type).length
  };

  const handleSearch = () => {
    refetch();
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Social Media Monitoring</Title>
          <Text c="dimmed" size="lg">
            Real-time social media alerts and disaster reports
          </Text>
        </div>
        <Group>
          <Badge color="orange" variant="filled" size="lg">
            {priorityPosts.length} Priority
          </Badge>
          <Badge color="blue" variant="light" size="lg">
            {allPosts.length} Total
          </Badge>
          {connected && (
            <Badge color="green" variant="light" size="sm">
              Live
            </Badge>
          )}
        </Group>
      </Group>

      {/* Search and Controls */}
      <Card mb="xl">
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Search Keywords"
              placeholder="Search by keywords (e.g., flood, emergency, help)"
              value={searchKeywords}
              onChange={(e) => setSearchKeywords(e.target.value)}
              leftSection={<IconSearch size={16} />}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label="Post Type"
              placeholder="All types"
              value={typeFilter}
              onChange={setTypeFilter}
              leftSection={<IconFilter size={16} />}
              data={[
                { value: 'need', label: '🆘 Need Help' },
                { value: 'offer', label: '✅ Offering Help' },
                { value: 'alert', label: '⚠️ Alert/Warning' },
                { value: 'general', label: '💬 General' }
              ]}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Group mt="xl">
              <Button
                onClick={handleSearch}
                loading={isRefetching}
                leftSection={<IconSearch size={16} />}
              >
                Search
              </Button>
              <Tooltip label="Refresh all posts">
                <ActionIcon
                  variant="light"
                  size="lg"
                  onClick={() => refetch()}
                  loading={isLoading}
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Grid.Col>
        </Grid>
      </Card>

      {isLoading && !isRefetching ? (
        <div style={{ position: 'relative', minHeight: 200 }}>
          <LoadingOverlay visible />
        </div>
      ) : (
        <Grid>
          {/* Priority Alerts Column */}
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Card>
              <Group mb="md">
                <IconAlertTriangle size={20} color="red" />
                <Title order={3} c="red">Priority Alerts</Title>
                <Badge color="red" variant="filled">
                  {priorityPosts.length}
                </Badge>
              </Group>
              
              {priorityPosts.length > 0 ? (
                <Stack gap="md">
                  {priorityPosts.map((post) => (
                    <Alert
                      key={post.id}
                      icon={<IconBell size={16} />}
                      title={`@${post.username} • ${post.platform}`}
                      color="red"
                      variant="light"
                    >
                      <Text size="sm" mb="xs">{post.text || post.content}</Text>
                      <Group gap="xs" mb="xs">
                        {post.type && (
                          <Badge
                            size="xs"
                            color={getPostTypeColor(post.type)}
                            leftSection={getPostTypeIcon(post.type)}
                          >
                            {post.type}
                          </Badge>
                        )}
                        {post.urgencyScore && (
                          <Badge size="xs" color="red">
                            Urgency: {post.urgencyScore}/6
                          </Badge>
                        )}
                      </Group>
                      <Group justify="space-between" gap="xs">
                        <Group gap="xs">
                          <IconUsers size={12} />
                          <Text size="xs" c="dimmed">{post.location}</Text>
                        </Group>
                        <Group gap="xs">
                          <IconClock size={12} />
                          <Text size="xs" c="dimmed">
                            {new Date(post.timestamp).toLocaleTimeString()}
                          </Text>
                        </Group>
                      </Group>
                      {post.tags && (
                        <Group gap="xs" mt="xs">
                          {post.tags.map((tag: string, index: number) => (
                            <Badge key={index} size="xs" variant="outline">
                              #{tag}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </Alert>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  {connected ? 'No priority alerts at this time' : 'Connecting to real-time updates...'}
                </Text>
              )}
            </Card>
          </Grid.Col>

          {/* Regular Posts Column */}
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Card>
              <Group mb="md">
                <IconUsers size={20} color="blue" />
                <Title order={3} c="blue">Regular Posts</Title>
                <Badge color="blue" variant="light">
                  {regularPosts.length}
                </Badge>
              </Group>
              
              {regularPosts.length > 0 ? (
                <Stack gap="md">
                  {regularPosts.map((post) => (
                    <Card
                      key={post.id}
                      withBorder
                      radius="sm"
                      p="sm"
                    >
                      <Group justify="space-between" mb="xs">
                        <Text fw={500} size="sm">@{post.username}</Text>
                        <Group gap="xs">
                          {post.type && (
                            <Badge
                              size="xs"
                              color={getPostTypeColor(post.type)}
                              leftSection={getPostTypeIcon(post.type)}
                            >
                              {post.type}
                            </Badge>
                          )}
                          <Badge size="xs" variant="light">
                            {post.platform}
                          </Badge>
                        </Group>
                      </Group>
                      <Text size="sm" mb="xs">{post.text || post.content}</Text>
                      <Group justify="space-between" gap="xs">
                        <Group gap="xs">
                          <IconUsers size={12} />
                          <Text size="xs" c="dimmed">{post.location}</Text>
                        </Group>
                        <Group gap="xs">
                          <IconClock size={12} />
                          <Text size="xs" c="dimmed">
                            {new Date(post.timestamp).toLocaleTimeString()}
                          </Text>
                        </Group>
                      </Group>
                      {post.tags && (
                        <Group gap="xs" mt="xs">
                          {post.tags.map((tag: string, index: number) => (
                            <Badge key={index} size="xs" variant="outline">
                              #{tag}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  {connected ? 'No regular posts found' : 'Connecting to real-time updates...'}
                </Text>
              )}
            </Card>
          </Grid.Col>
        </Grid>
      )}

      {/* Statistics */}
      {allPosts.length > 0 && (
        <Card mt="xl">
          <Title order={4} mb="md">Statistics</Title>
          <Grid>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <div>
                <Text size="xl" fw={700} c="red">{priorityPosts.length}</Text>
                <Text size="sm" c="dimmed">Priority Alerts</Text>
              </div>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <div>
                <Text size="xl" fw={700} c="blue">{allPosts.length}</Text>
                <Text size="sm" c="dimmed">Total Posts</Text>
              </div>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <div>
                <Text size="xl" fw={700} c="green">
                  {Math.round((priorityPosts.length / allPosts.length) * 100) || 0}%
                </Text>
                <Text size="sm" c="dimmed">Priority Rate</Text>
              </div>
            </Grid.Col>
            {connected && (
              <Grid.Col span={{ base: 6, md: 3 }}>
                <div>
                  <Text size="xl" fw={700} c="green">Live</Text>
                  <Text size="sm" c="dimmed">Real-time Updates</Text>
                </div>
              </Grid.Col>
            )}
          </Grid>

          {/* Post Type Breakdown */}
          <Title order={5} mt="xl" mb="md">Post Type Breakdown</Title>
          <Grid>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <Group gap="xs">
                <IconSos size={16} color="red" />
                <div>
                  <Text size="lg" fw={700} c="red">{typeCounts.need}</Text>
                  <Text size="sm" c="dimmed">Need Help</Text>
                </div>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <Group gap="xs">
                <IconGift size={16} color="green" />
                <div>
                  <Text size="lg" fw={700} c="green">{typeCounts.offer}</Text>
                  <Text size="sm" c="dimmed">Offering Help</Text>
                </div>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <Group gap="xs">
                <IconExclamationMark size={16} color="orange" />
                <div>
                  <Text size="lg" fw={700} c="orange">{typeCounts.alert}</Text>
                  <Text size="sm" c="dimmed">Alerts</Text>
                </div>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <Group gap="xs">
                <IconUsers size={16} color="gray" />
                <div>
                  <Text size="lg" fw={700} c="gray">{typeCounts.general}</Text>
                  <Text size="sm" c="dimmed">General</Text>
                </div>
              </Group>
            </Grid.Col>
          </Grid>
        </Card>
      )}
    </Container>
  );
}

export default SocialMediaPage;
