import {
  Title,
  Text,
  Button,
  Container,
  Grid,
  Card,
  Group,
  Badge,
  Stack,
  Alert,
  LoadingOverlay,
  ActionIcon,
  Tooltip
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconMapPin,
  IconUsers,
  IconBell,
  IconRefresh,
  IconEye
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getDisasters, getMockSocialMediaPosts, Disaster } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

function HomePage() {
  const [realtimeActiveDisasters, setRealtimeActiveDisasters] = useState<Disaster[]>([]);
  const [realtimePriorityAlerts, setRealtimePriorityAlerts] = useState<any[]>([]);
  const { socket, connected } = useWebSocket();

  const {
    data: disasters,
    isLoading: disastersLoading,
    refetch: refetchDisasters
  } = useQuery<Disaster[]>({
    queryKey: ['disasters'],
    queryFn: getDisasters,
    retry: 1,
  });

  const {
    data: socialMedia,
    isLoading: socialLoading,
    refetch: refetchSocial
  } = useQuery({
    queryKey: ['social-media'],
    queryFn: () => getMockSocialMediaPosts(),
    retry: 1,
  });

  // WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Setting up WebSocket listeners for HomePage');

    // Listen for active disasters updates
    socket.on('active_disasters_updated', (data: any) => {
      console.log('📡 Received active disasters update:', data);
      setRealtimeActiveDisasters(data.disasters || []);
    });

    // Listen for priority alerts
    socket.on('priority_alerts', (data: any) => {
      console.log('🚨 Received priority alerts:', data);
      setRealtimePriorityAlerts(data.alerts || []);
    });

    // Listen for social media updates
    socket.on('social_media_global_update', (data: any) => {
      console.log('📱 Received social media update:', data);
      // Update priority alerts from social media data
      const urgentPosts = data.posts?.filter((post: any) => post.isUrgent) || [];
      setRealtimePriorityAlerts(urgentPosts);
    });

    return () => {
      socket.off('active_disasters_updated');
      socket.off('priority_alerts');
      socket.off('social_media_global_update');
    };
  }, [socket]);

  // Use realtime data if available, otherwise fallback to API data
  const activeDisasters = realtimeActiveDisasters.length > 0
    ? realtimeActiveDisasters
    : disasters?.filter(d => d.status === 'reported' || d.status === 'verified' || d.status === 'in_progress') || [];

  const priorityAlerts = realtimePriorityAlerts.length > 0
    ? realtimePriorityAlerts
    : socialMedia?.posts?.filter(p => p.isPriority) || [];

  return (
    <Container size="xl" py="xl">
      {/* Hero Section */}
      <Stack align="center" mb="xl">
        <Title order={1} size="3rem" ta="center" c="blue">
          🚨 Disaster Response Platform
        </Title>
        <Text size="xl" ta="center" c="dimmed" maw={600}>
          Real-time coordination and response for emergency situations.
          Monitor disasters, track resources, and coordinate relief efforts.
        </Text>
      </Stack>

      {/* Dashboard Grid */}
      <Grid>
        {/* Active Disasters Card */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="md" padding="lg" radius="md" h="100%">
            <Group justify="space-between" mb="md">
              <Group>
                <IconAlertTriangle size={24} color="red" />
                <Title order={3}>Active Disasters</Title>
              </Group>
              <Group>
                <Badge color="red" variant="filled" size="lg">
                  {activeDisasters.length}
                </Badge>
                <Tooltip label="Refresh disasters">
                  <ActionIcon
                    variant="light"
                    onClick={() => refetchDisasters()}
                    loading={disastersLoading}
                  >
                    <IconRefresh size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            {disastersLoading ? (
              <LoadingOverlay visible />
            ) : activeDisasters.length > 0 ? (
              <Stack gap="sm">
                {activeDisasters.slice(0, 3).map((disaster) => (
                  <Alert
                    key={disaster.id}
                    icon={<IconMapPin size={16} />}
                    title={disaster.title}
                    color={disaster.severity === 'high' ? 'red' : disaster.severity === 'medium' ? 'yellow' : 'blue'}
                    variant="light"
                  >
                    <Text size="sm">{disaster.location_name}</Text>
                  </Alert>
                ))}
                {activeDisasters.length > 3 && (
                  <Text size="sm" c="dimmed" ta="center">
                    +{activeDisasters.length - 3} more disasters
                  </Text>
                )}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                {connected ? 'No active disasters' : 'Connecting to real-time updates...'}
              </Text>
            )}

            <Button
              component={Link}
              to="/disasters"
              fullWidth
              mt="md"
              leftSection={<IconEye size={16} />}
            >
              View All Disasters
            </Button>
          </Card>
        </Grid.Col>

        {/* Priority Alerts Card */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="md" padding="lg" radius="md" h="100%">
            <Group justify="space-between" mb="md">
              <Group>
                <IconBell size={24} color="orange" />
                <Title order={3}>Priority Alerts</Title>
              </Group>
              <Group>
                <Badge color="orange" variant="filled" size="lg">
                  {priorityAlerts.length}
                </Badge>
                <Tooltip label="Refresh alerts">
                  <ActionIcon
                    variant="light"
                    onClick={() => refetchSocial()}
                    loading={socialLoading}
                  >
                    <IconRefresh size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            {socialLoading ? (
              <LoadingOverlay visible />
            ) : priorityAlerts.length > 0 ? (
              <Stack gap="sm">
                {priorityAlerts.slice(0, 3).map((alert) => (
                  <Alert
                    key={alert.id}
                    icon={<IconUsers size={16} />}
                    title={alert.user ? `@${alert.user}` : (alert.username ? `@${alert.username}` : 'Alert')}
                    color="orange"
                    variant="light"
                  >
                    <Text size="sm" lineClamp={2}>{alert.content || alert.text}</Text>
                    <Text size="xs" c="dimmed" mt="xs">{alert.location}</Text>
                    {alert.urgencyScore && (
                      <Badge size="xs" color="red" mt="xs">
                        Urgency: {alert.urgencyScore}/6
                      </Badge>
                    )}
                  </Alert>
                ))}
                {priorityAlerts.length > 3 && (
                  <Text size="sm" c="dimmed" ta="center">
                    +{priorityAlerts.length - 3} more alerts
                  </Text>
                )}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                {connected ? 'No priority alerts' : 'Connecting to real-time updates...'}
              </Text>
            )}

            <Button
              component={Link}
              to="/social-media"
              fullWidth
              mt="md"
              variant="light"
              leftSection={<IconEye size={16} />}
            >
              View All Alerts
            </Button>
          </Card>
        </Grid.Col>

        {/* Quick Actions */}
        <Grid.Col span={12}>
          <Card shadow="md" padding="lg" radius="md">
            <Title order={3} mb="md">Quick Actions</Title>
            <Group>
              <Button
                component={Link}
                to="/disasters/new"
                size="lg"
                leftSection={<IconAlertTriangle size={20} />}
              >
                Report Disaster
              </Button>
              <Button
                component={Link}
                to="/resources"
                size="lg"
                variant="light"
                leftSection={<IconMapPin size={20} />}
              >
                Find Resources
              </Button>
              <Button
                component={Link}
                to="/reports/new"
                size="lg"
                variant="outline"
                leftSection={<IconUsers size={20} />}
              >
                Submit Report
              </Button>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

export default HomePage;
