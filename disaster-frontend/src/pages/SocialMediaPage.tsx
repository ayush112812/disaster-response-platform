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
  Grid
} from '@mantine/core';
import { 
  IconBell, 
  IconRefresh, 
  IconSearch,
  IconAlertTriangle,
  IconUsers,
  IconClock
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getMockSocialMediaPosts } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

function SocialMediaPage() {
  const [searchKeywords, setSearchKeywords] = useState('');
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
  const allPosts = realtimePosts.length > 0 ? realtimePosts : socialMedia?.posts || [];
  const priorityPosts = allPosts.filter(p => p.isPriority || p.isUrgent) || [];
  const regularPosts = allPosts.filter(p => !p.isPriority && !p.isUrgent) || [];

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
        <Group>
          <TextInput
            placeholder="Search by keywords (e.g., flood, emergency, help)"
            value={searchKeywords}
            onChange={(e) => setSearchKeywords(e.target.value)}
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
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
                      {post.urgencyScore && (
                        <Badge size="xs" color="red" mb="xs">
                          Urgency: {post.urgencyScore}/6
                        </Badge>
                      )}
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
                        <Badge size="xs" variant="light">
                          {post.platform}
                        </Badge>
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
          <Group>
            <div>
              <Text size="xl" fw={700} c="red">{priorityPosts.length}</Text>
              <Text size="sm" c="dimmed">Priority Alerts</Text>
            </div>
            <div>
              <Text size="xl" fw={700} c="blue">{allPosts.length}</Text>
              <Text size="sm" c="dimmed">Total Posts</Text>
            </div>
            <div>
              <Text size="xl" fw={700} c="green">
                {Math.round((priorityPosts.length / allPosts.length) * 100) || 0}%
              </Text>
              <Text size="sm" c="dimmed">Priority Rate</Text>
            </div>
            {connected && (
              <div>
                <Text size="xl" fw={700} c="green">Live</Text>
                <Text size="sm" c="dimmed">Real-time Updates</Text>
              </div>
            )}
          </Group>
        </Card>
      )}
    </Container>
  );
}

export default SocialMediaPage;
