import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Title,
  Text,
  LoadingOverlay,
  Card,
  Group,
  Badge,
  Button,
  Container,
  Alert,
  Stack,
  Divider,
  Paper,
  SimpleGrid,
  Tabs,
  Grid,
  ActionIcon,
  Tooltip,
  Timeline,
  ThemeIcon
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconAlertCircle, IconArrowLeft, IconMapPin,
  IconCalendar, IconCalendarDue,
  IconInfoCircle, IconAlertTriangle, IconUsers, IconBell,
  IconMedicalCross, IconHome, IconDroplet, IconBread,
  IconRefresh, IconExternalLink, IconHistory, IconPhoto } from '@tabler/icons-react';
import { getDisaster, Disaster, ApiError, getSocialMediaPosts, getOfficialUpdates,
  getNearbyResources, SocialMediaPost, OfficialUpdate, Resource } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useEffect, useState } from 'react';

const severityColors = {
  low: 'blue',
  medium: 'yellow',
  high: 'red',
} as const;

const statusColors = {
  active: 'red',
  resolved: 'green',
  mitigated: 'yellow',
} as const;

interface DisasterWithDetails extends Disaster {
  coordinates?: {
    lat: number;
    lng: number;
  };
  affectedAreas?: string[];
  additionalInfo?: string;
}

function DisasterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [realtimeSocialMedia, setRealtimeSocialMedia] = useState<SocialMediaPost[]>([]);
  const { socket, connected } = useWebSocket();

  const {
    data: disaster,
    isLoading,
    error,
    isError,
    refetch
  } = useQuery<DisasterWithDetails, ApiError>({
    queryKey: ['disaster', id],
    queryFn: () => getDisaster(id!),
    enabled: !!id,
    retry: 2,
  });

  // Social Media Data
  const {
    data: socialMediaData,
    isLoading: socialLoading,
    refetch: refetchSocial
  } = useQuery({
    queryKey: ['social-media', id],
    queryFn: () => getSocialMediaPosts(id!, { limit: 20 }),
    enabled: !!id,
    retry: 1,
  });

  // Official Updates Data
  const {
    data: officialUpdatesData,
    isLoading: updatesLoading,
    refetch: refetchUpdates
  } = useQuery({
    queryKey: ['official-updates', id],
    queryFn: () => getOfficialUpdates(id!, 10),
    enabled: !!id,
    retry: 1,
  });

  // Nearby Resources Data (using disaster location if available)
  const {
    data: nearbyResourcesData,
    isLoading: resourcesLoading,
    refetch: refetchResources
  } = useQuery({
    queryKey: ['nearby-resources', id],
    queryFn: () => {
      // Default to NYC coordinates if disaster location not available
      const lat = disaster?.latitude || 40.7128;
      const lng = disaster?.longitude || -74.0060;
      return getNearbyResources(lat, lng, 10);
    },
    enabled: !!id && !!disaster,
    retry: 1,
  });



  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!socket || !id) return;

    console.log('🔌 Setting up WebSocket listeners for disaster:', id);

    // Join disaster room
    socket.emit('join_disaster', id);

    // Listen for social media updates
    socket.on('social_media_updated', (data: any) => {
      console.log('📱 Received social media update for disaster:', data);
      setRealtimeSocialMedia(data.data || []);
    });

    // Listen for disaster updates
    socket.on('disaster_updated', (data: any) => {
      console.log('🚨 Disaster updated:', data);
      refetch();
    });

    // Listen for resource updates
    socket.on('resource_updated', (data: any) => {
      console.log('🏠 Resource updated:', data);
      refetchResources();
    });

    return () => {
      socket.emit('leave_disaster', id);
      socket.off('social_media_updated');
      socket.off('disaster_updated');
      socket.off('resource_updated');
    };
  }, [socket, id, refetch, refetchResources]);

  if (isLoading) {
    return (
      <div style={{ position: 'relative', minHeight: 300 }}>
        <LoadingOverlay visible={true} />
      </div>
    );
  }

  if (isError) {
    return (
      <Container size="md" py="xl">
        <Alert 
          icon={<IconAlertCircle size="1.5rem" />} 
          title="Error loading disaster details"
          color="red"
          variant="outline"
          my="xl"
        >
          {error?.message || 'Failed to load disaster details. Please try again later.'}
          <Group mt="md">
            <Button 
              variant="light" 
              onClick={() => navigate(-1)}
              leftSection={<IconArrowLeft size={16} />}
            >
              Go Back
            </Button>
            <Button 
              variant="filled" 
              onClick={() => refetch()}
              loading={isLoading}
            >
              Retry
            </Button>
          </Group>
        </Alert>
      </Container>
    );
  }

  if (!disaster) {
    return (
      <Container size="md" py="xl">
        <Alert 
          icon={<IconInfoCircle size="1.5rem" />} 
          title="Disaster not found"
          color="blue"
          variant="outline"
          my="xl"
        >
          <Text>The requested disaster could not be found or has been removed.</Text>
          <Button 
            component={Link} 
            to="/disasters" 
            variant="light" 
            mt="md"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to Disasters
          </Button>
        </Alert>
      </Container>
    );
  }

  // Use realtime social media data if available
  const socialPosts = realtimeSocialMedia.length > 0
    ? realtimeSocialMedia
    : socialMediaData?.posts || [];

  return (
    <Container size="xl" py="xl">
      <Button
        component={Link}
        to="/disasters"
        variant="light"
        mb="xl"
        leftSection={<IconArrowLeft size={16} />}
      >
        Back to Disasters
      </Button>

      <Card shadow="sm" padding="xl" radius="md" withBorder mb="xl">
        <Group justify="space-between" align="flex-start" mb="xl">
          <div>
            <Title order={2} mb="sm">{disaster.title}</Title>
            <Group mb="xs">
              <Badge
                color={severityColors[disaster.severity as keyof typeof severityColors]}
                size="lg"
                variant="light"
                leftSection={<IconAlertTriangle size={14} style={{ marginRight: 4 }} />}
              >
                {disaster.severity.charAt(0).toUpperCase() + disaster.severity.slice(1)}
              </Badge>
              <Badge
                color={statusColors[disaster.status as keyof typeof statusColors]}
                size="lg"
                variant="outline"
              >
                {disaster.status.charAt(0).toUpperCase() + disaster.status.slice(1)}
              </Badge>
              {connected && (
                <Badge color="green" variant="light" size="sm">
                  Live Updates
                </Badge>
              )}
            </Group>
          </div>

          <Group>
            <Button
              variant="outline"
              component={Link}
              to={`/disasters/${disaster.id}/edit`}
            >
              Edit Details
            </Button>
            <Tooltip label="Refresh all data">
              <ActionIcon
                variant="light"
                size="lg"
                onClick={() => {
                  refetch();
                  refetchSocial();
                  refetchUpdates();
                  refetchResources();
                }}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
        
        <Divider my="md" />
        
        <Stack gap="lg">
          <Paper p="md" withBorder>
            <Title order={4} mb="md">
              <IconMapPin size={20} style={{ marginRight: 8 }} />
              Location Details
            </Title>
            <Text>{disaster.location_name}</Text>
            {disaster.location && (
              <Text size="sm" c="dimmed" mt={4}>
                Location: {disaster.location}
              </Text>
            )}
          </Paper>
          
          <Paper p="md" withBorder>
            <Title order={4} mb="md">
              <IconInfoCircle size={20} style={{ marginRight: 8 }} />
              Description
            </Title>
            <Text>{disaster.description}</Text>
          </Paper>
          
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Paper p="md" withBorder>
              <Title order={4} mb="md">
                <IconCalendar size={20} style={{ marginRight: 8 }} />
                Created Date
              </Title>
              <Text>{new Date(disaster.created_at).toLocaleDateString()}</Text>
              <Text size="sm" c="dimmed">
                {new Date(disaster.created_at).toLocaleTimeString()}
              </Text>
            </Paper>

            <Paper p="md" withBorder>
              <Title order={4} mb="md">
                <IconCalendarDue size={20} style={{ marginRight: 8 }} />
                Last Updated
              </Title>
              <Text>{new Date(disaster.updated_at).toLocaleDateString()}</Text>
              <Text size="sm" c="dimmed">
                {new Date(disaster.updated_at).toLocaleTimeString()}
              </Text>
            </Paper>
          </SimpleGrid>
          
          {disaster.tags && disaster.tags.length > 0 && (
            <Paper p="md" withBorder>
              <Title order={4} mb="md">Tags</Title>
              <Group gap="xs">
                {disaster.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </Group>
            </Paper>
          )}

          <Paper p="md" withBorder>
            <Title order={4} mb="md">Owner Information</Title>
            <Text>Owner ID: {disaster.owner_id}</Text>
            <Text size="sm" c="dimmed" mt={4}>
              Created: {new Date(disaster.created_at).toLocaleString()}
            </Text>
            <Text size="sm" c="dimmed">
              Last updated: {new Date(disaster.updated_at).toLocaleString()}
            </Text>
          </Paper>
        </Stack>
      </Card>

      {/* Tabbed Interface for Additional Features */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="social-media" leftSection={<IconUsers size={16} />}>
            Social Media ({socialPosts.length})
          </Tabs.Tab>
          <Tabs.Tab value="resources" leftSection={<IconHome size={16} />}>
            Nearby Resources ({nearbyResourcesData?.resources.length || 0})
          </Tabs.Tab>
          <Tabs.Tab value="official-updates" leftSection={<IconBell size={16} />}>
            Official Updates ({officialUpdatesData?.updates.length || 0})
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
            History
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          <Card mt="md">
            <Title order={3} mb="md">Disaster Overview</Title>
            <Text>
              This disaster is currently being monitored with real-time updates from social media,
              official sources, and nearby resources. Use the tabs above to explore different aspects
              of this disaster response.
            </Text>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="social-media">
          <Card mt="md">
            <Group justify="space-between" mb="md">
              <Title order={3}>Social Media Monitoring</Title>
              <Group>
                <Badge color="blue" variant="light">
                  {socialPosts.length} Posts
                </Badge>
                {connected && (
                  <Badge color="green" variant="light" size="sm">
                    Live Updates
                  </Badge>
                )}
                <ActionIcon
                  variant="light"
                  onClick={() => refetchSocial()}
                  loading={socialLoading}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              </Group>
            </Group>

            {socialLoading ? (
              <LoadingOverlay visible />
            ) : socialPosts.length > 0 ? (
              <Stack gap="md">
                {socialPosts.slice(0, 10).map((post) => (
                  <Alert
                    key={post.id}
                    icon={post.isPriority ? <IconAlertTriangle size={16} /> : <IconUsers size={16} />}
                    title={`@${post.username} • ${post.platform}`}
                    color={post.isPriority ? "red" : "blue"}
                    variant="light"
                  >
                    <Text size="sm" mb="xs">{post.text}</Text>
                    <Group justify="space-between" gap="xs">
                      <Text size="xs" c="dimmed">{post.location}</Text>
                      <Text size="xs" c="dimmed">
                        {new Date(post.timestamp).toLocaleTimeString()}
                      </Text>
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
                No social media posts found for this disaster
              </Text>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="resources">
          <Card mt="md">
            <Group justify="space-between" mb="md">
              <Title order={3}>Nearby Resources</Title>
              <Group>
                <Badge color="green" variant="light">
                  {nearbyResourcesData?.resources.length || 0} Resources
                </Badge>
                <ActionIcon
                  variant="light"
                  onClick={() => refetchResources()}
                  loading={resourcesLoading}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              </Group>
            </Group>

            {resourcesLoading ? (
              <LoadingOverlay visible />
            ) : nearbyResourcesData?.resources && nearbyResourcesData.resources.length > 0 ? (
              <Stack gap="md">
                {nearbyResourcesData.resources.map((resource) => {
                  const getResourceIcon = (type: string) => {
                    switch (type) {
                      case 'medical': return <IconMedicalCross size={20} />;
                      case 'shelter': return <IconHome size={20} />;
                      case 'water': return <IconDroplet size={20} />;
                      case 'food': return <IconBread size={20} />;
                      default: return <IconMapPin size={20} />;
                    }
                  };

                  return (
                    <Card key={resource.id} withBorder p="md">
                      <Group justify="space-between" mb="md">
                        <Group>
                          {getResourceIcon(resource.type)}
                          <div>
                            <Text fw={600}>{resource.name}</Text>
                            <Text size="sm" c="dimmed">{resource.location_name}</Text>
                          </div>
                        </Group>
                        <Badge variant="light">
                          {resource.type}
                        </Badge>
                      </Group>
                      <Text size="sm" mb="md">{resource.description}</Text>
                      <Group justify="space-between">
                        <Text size="sm">Capacity: {resource.quantity}</Text>
                        <Text size="sm" c="dimmed">By: {resource.created_by}</Text>
                      </Group>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No nearby resources found
              </Text>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="official-updates">
          <Card mt="md">
            <Group justify="space-between" mb="md">
              <Title order={3}>Official Updates</Title>
              <Group>
                <Badge color="orange" variant="light">
                  {officialUpdatesData?.updates.length || 0} Updates
                </Badge>
                <ActionIcon
                  variant="light"
                  onClick={() => refetchUpdates()}
                  loading={updatesLoading}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              </Group>
            </Group>

            {updatesLoading ? (
              <LoadingOverlay visible />
            ) : officialUpdatesData?.updates && officialUpdatesData.updates.length > 0 ? (
              <Stack gap="md">
                {officialUpdatesData.updates.map((update) => (
                  <Card key={update.id} withBorder p="md">
                    <Group justify="space-between" mb="md">
                      <div>
                        <Text fw={600}>{update.title}</Text>
                        <Text size="sm" c="dimmed">{update.source}</Text>
                      </div>
                      <Group>
                        <Badge size="xs" variant="outline">
                          Relevance: {Math.round(update.relevance * 100)}%
                        </Badge>
                        <ActionIcon
                          component="a"
                          href={update.url}
                          target="_blank"
                          variant="light"
                          size="sm"
                        >
                          <IconExternalLink size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    <Text size="sm" mb="md">{update.content}</Text>
                    <Text size="xs" c="dimmed">
                      {new Date(update.timestamp).toLocaleString()}
                    </Text>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No official updates found
              </Text>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <Stack gap="md" mt="md">
            {/* Quick Timeline Overview */}
            <Card>
              <Title order={3} mb="md">Quick Timeline</Title>
              <Timeline active={-1} bulletSize={24} lineWidth={2}>
                <Timeline.Item
                  bullet={<ThemeIcon color="green" size={24} radius="xl">
                    <IconAlertTriangle size={12} />
                  </ThemeIcon>}
                  title="Disaster Created"
                >
                  <Text c="dimmed" size="sm">
                    Created by {disaster.owner_id}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(disaster.created_at).toLocaleString()}
                  </Text>
                </Timeline.Item>

                {disaster.updated_at !== disaster.created_at && (
                  <Timeline.Item
                    bullet={<ThemeIcon color="blue" size={24} radius="xl">
                      <IconRefresh size={12} />
                    </ThemeIcon>}
                    title="Last Updated"
                  >
                    <Text c="dimmed" size="sm">
                      Disaster information was updated
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(disaster.updated_at).toLocaleString()}
                    </Text>
                  </Timeline.Item>
                )}

                <Timeline.Item
                  bullet={<ThemeIcon color="orange" size={24} radius="xl">
                    <IconBell size={12} />
                  </ThemeIcon>}
                  title="Monitoring Active"
                >
                  <Text c="dimmed" size="sm">
                    Real-time monitoring for social media, official updates, and resources
                  </Text>
                  <Text size="xs" c="dimmed">
                    Status: {connected ? 'Connected' : 'Disconnected'}
                  </Text>
                </Timeline.Item>
              </Timeline>
            </Card>


          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

export default DisasterDetailPage;
