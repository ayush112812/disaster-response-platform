import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Card, Text, Button, Group, Stack, Badge, Tabs, Alert, 
  TextInput, FileInput, LoadingOverlay, Divider, ActionIcon,
  Grid, Paper, Timeline, Avatar, Anchor
} from '@mantine/core';
import { 
  IconMapPin, IconAlertTriangle, IconBuildingStore, IconBrandTwitter, 
  IconNews, IconPhoto, IconRefresh, IconExternalLink, IconCheck,
  IconX, IconClock, IconUsers, IconPhone, IconWorld
} from '@tabler/icons-react';

interface Disaster {
  id: string;
  title: string;
  description: string;
  location_name: string;
  tags: string[];
  created_at: string;
}

interface Resource {
  id: string;
  name: string;
  type: string;
  location_name: string;
  address: string;
  contact: string;
  capacity: number;
  availability: string;
  distance_meters: number;
  coordinates: { lat: number; lng: number };
}

interface SocialPost {
  id: string;
  platform: string;
  username: string;
  user_display_name: string;
  post: string;
  timestamp: string;
  likes: number;
  retweets: number;
  verified: boolean;
  hashtags: string[];
  media_urls: string[];
  classification: 'alert' | 'need' | 'offer';
}

interface OfficialUpdate {
  id: string;
  source: string;
  source_url: string;
  title: string;
  content: string;
  timestamp: string;
  type: string;
  urgency: 'low' | 'medium' | 'high';
  contact_info: {
    phone: string;
    website: string;
  };
}

interface ImageVerification {
  is_authentic: boolean;
  matches_disaster_type: boolean;
  confidence_score: number;
  details: string;
  detected_elements: string[];
  manipulation_indicators: string[];
  verification_timestamp: string;
  image_url: string;
}

const DisasterDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [disaster, setDisaster] = useState<Disaster | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [officialUpdates, setOfficialUpdates] = useState<OfficialUpdate[]>([]);
  const [imageVerification, setImageVerification] = useState<ImageVerification | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  
  const [imageUrl, setImageUrl] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [activeTab, setActiveTab] = useState('resources');

  useEffect(() => {
    if (id) {
      fetchDisasterDetails();
    }
  }, [id]);

  const fetchDisasterDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/disasters/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setDisaster(data.disaster);
        // Auto-load resources
        fetchResources();
      }
    } catch (error) {
      console.error('Error fetching disaster details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      setResourcesLoading(true);
      const response = await fetch(`/api/disasters/${id}/resources?radius=10000`);
      const data = await response.json();
      
      if (data.success) {
        setResources(data.resources);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setResourcesLoading(false);
    }
  };

  const fetchSocialMedia = async () => {
    try {
      setSocialLoading(true);
      const response = await fetch(`/api/disasters/${id}/social-media?limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setSocialPosts(data.social_media_posts);
      }
    } catch (error) {
      console.error('Error fetching social media:', error);
    } finally {
      setSocialLoading(false);
    }
  };

  const fetchOfficialUpdates = async () => {
    try {
      setUpdatesLoading(true);
      const response = await fetch(`/api/disasters/${id}/official-updates?limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setOfficialUpdates(data.official_updates);
      }
    } catch (error) {
      console.error('Error fetching official updates:', error);
    } finally {
      setUpdatesLoading(false);
    }
  };

  const verifyImage = async () => {
    if (!imageUrl.trim()) return;
    
    try {
      setImageLoading(true);
      const response = await fetch(`/api/disasters/${id}/verify-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          description: imageDescription
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setImageVerification(data.verification);
      }
    } catch (error) {
      console.error('Error verifying image:', error);
    } finally {
      setImageLoading(false);
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'alert': return 'red';
      case 'need': return 'orange';
      case 'offer': return 'green';
      default: return 'blue';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'green';
      case 'limited': return 'orange';
      case 'full': return 'red';
      default: return 'gray';
    }
  };

  if (loading) {
    return <LoadingOverlay visible />;
  }

  if (!disaster) {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={16} />}>
        Disaster not found
      </Alert>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <Stack gap="xl">
        {/* Disaster Header */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text size="xl" fw={700}>{disaster.title}</Text>
                <Group gap="xs" mt="xs">
                  <IconMapPin size={16} />
                  <Text c="dimmed">{disaster.location_name}</Text>
                </Group>
              </div>
              <Group gap="xs">
                {disaster.tags.map((tag, index) => (
                  <Badge key={index} variant="light">
                    {tag}
                  </Badge>
                ))}
              </Group>
            </Group>
            <Text>{disaster.description}</Text>
            <Text size="sm" c="dimmed">
              Created: {new Date(disaster.created_at).toLocaleString()}
            </Text>
          </Stack>
        </Card>

        {/* Feature Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="resources" leftSection={<IconBuildingStore size={16} />}>
              Nearby Resources ({resources.length})
            </Tabs.Tab>
            <Tabs.Tab value="social" leftSection={<IconBrandTwitter size={16} />}>
              Social Media
            </Tabs.Tab>
            <Tabs.Tab value="official" leftSection={<IconNews size={16} />}>
              Official Updates
            </Tabs.Tab>
            <Tabs.Tab value="verify" leftSection={<IconPhoto size={16} />}>
              Image Verification
            </Tabs.Tab>
          </Tabs.List>

          {/* Resources Tab */}
          <Tabs.Panel value="resources" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>Nearby Resources & Shelters</Text>
                <Button 
                  leftSection={<IconRefresh size={16} />}
                  variant="light"
                  onClick={fetchResources}
                  loading={resourcesLoading}
                >
                  Refresh
                </Button>
              </Group>
              
              <Grid>
                {resources.map((resource) => (
                  <Grid.Col key={resource.id} span={{ base: 12, md: 6 }}>
                    <Card withBorder padding="md">
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text fw={500}>{resource.name}</Text>
                          <Badge color={getAvailabilityColor(resource.availability)}>
                            {resource.availability}
                          </Badge>
                        </Group>
                        <Group gap="xs">
                          <Badge variant="light">{resource.type}</Badge>
                          <Text size="sm" c="dimmed">
                            {Math.round(resource.distance_meters / 1000 * 10) / 10} km away
                          </Text>
                        </Group>
                        <Text size="sm">{resource.address}</Text>
                        <Group gap="xs">
                          <IconPhone size={14} />
                          <Text size="sm">{resource.contact}</Text>
                        </Group>
                        <Group gap="xs">
                          <IconUsers size={14} />
                          <Text size="sm">Capacity: {resource.capacity}</Text>
                        </Group>
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
              
              {resources.length === 0 && !resourcesLoading && (
                <Alert>
                  No resources found. Try refreshing or check back later.
                </Alert>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Social Media Tab */}
          <Tabs.Panel value="social" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>Social Media Reports</Text>
                <Button 
                  leftSection={<IconRefresh size={16} />}
                  variant="light"
                  onClick={fetchSocialMedia}
                  loading={socialLoading}
                >
                  Load Posts
                </Button>
              </Group>
              
              <Timeline active={socialPosts.length} bulletSize={24} lineWidth={2}>
                {socialPosts.map((post) => (
                  <Timeline.Item
                    key={post.id}
                    bullet={<IconBrandTwitter size={12} />}
                    title={
                      <Group gap="xs">
                        <Text fw={500}>{post.user_display_name}</Text>
                        <Text size="sm" c="dimmed">@{post.username}</Text>
                        {post.verified && <IconCheck size={14} color="blue" />}
                        <Badge size="xs" color={getClassificationColor(post.classification)}>
                          {post.classification}
                        </Badge>
                      </Group>
                    }
                  >
                    <Text size="sm" mb="xs">{post.post}</Text>
                    <Group gap="xs" mb="xs">
                      {post.hashtags.map((tag, index) => (
                        <Badge key={index} size="xs" variant="light">
                          #{tag}
                        </Badge>
                      ))}
                    </Group>
                    <Group gap="md">
                      <Text size="xs" c="dimmed">
                        {new Date(post.timestamp).toLocaleString()}
                      </Text>
                      <Text size="xs" c="dimmed">
                        ❤️ {post.likes} 🔄 {post.retweets}
                      </Text>
                    </Group>
                  </Timeline.Item>
                ))}
              </Timeline>
              
              {socialPosts.length === 0 && !socialLoading && (
                <Alert>
                  No social media posts loaded. Click "Load Posts" to fetch recent posts.
                </Alert>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Official Updates Tab */}
          <Tabs.Panel value="official" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>Official Updates & Alerts</Text>
                <Button 
                  leftSection={<IconRefresh size={16} />}
                  variant="light"
                  onClick={fetchOfficialUpdates}
                  loading={updatesLoading}
                >
                  Load Updates
                </Button>
              </Group>
              
              <Stack gap="md">
                {officialUpdates.map((update) => (
                  <Card key={update.id} withBorder padding="md">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Group gap="xs">
                          <Text fw={500}>{update.source}</Text>
                          <Badge color={getUrgencyColor(update.urgency)}>
                            {update.urgency} priority
                          </Badge>
                          <Badge variant="light">{update.type}</Badge>
                        </Group>
                        <ActionIcon 
                          variant="light" 
                          component="a" 
                          href={update.source_url} 
                          target="_blank"
                        >
                          <IconExternalLink size={16} />
                        </ActionIcon>
                      </Group>
                      <Text fw={500}>{update.title}</Text>
                      <Text size="sm">{update.content}</Text>
                      <Divider />
                      <Group justify="space-between">
                        <Group gap="md">
                          <Group gap="xs">
                            <IconPhone size={14} />
                            <Text size="sm">{update.contact_info.phone}</Text>
                          </Group>
                          <Group gap="xs">
                            <IconWorld size={14} />
                            <Anchor size="sm" href={update.contact_info.website} target="_blank">
                              Website
                            </Anchor>
                          </Group>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {new Date(update.timestamp).toLocaleString()}
                        </Text>
                      </Group>
                    </Stack>
                  </Card>
                ))}
              </Stack>
              
              {officialUpdates.length === 0 && !updatesLoading && (
                <Alert>
                  No official updates loaded. Click "Load Updates" to fetch recent updates.
                </Alert>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Image Verification Tab */}
          <Tabs.Panel value="verify" pt="md">
            <Stack gap="md">
              <Text fw={500}>Image Verification with Gemini AI</Text>
              
              <Card withBorder padding="md">
                <Stack gap="md">
                  <TextInput
                    label="Image URL"
                    placeholder="https://example.com/disaster-image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <TextInput
                    label="Description (optional)"
                    placeholder="Describe what the image should show..."
                    value={imageDescription}
                    onChange={(e) => setImageDescription(e.target.value)}
                  />
                  <Button 
                    leftSection={<IconPhoto size={16} />}
                    onClick={verifyImage}
                    loading={imageLoading}
                    disabled={!imageUrl.trim()}
                  >
                    Verify Image with Gemini AI
                  </Button>
                </Stack>
              </Card>
              
              {imageVerification && (
                <Card withBorder padding="md">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={500}>Verification Results</Text>
                      <Group gap="xs">
                        <Badge color={imageVerification.is_authentic ? 'green' : 'red'}>
                          {imageVerification.is_authentic ? 'Authentic' : 'Suspicious'}
                        </Badge>
                        <Badge color={imageVerification.matches_disaster_type ? 'green' : 'orange'}>
                          {imageVerification.matches_disaster_type ? 'Matches Type' : 'Type Mismatch'}
                        </Badge>
                      </Group>
                    </Group>
                    
                    <Group gap="md">
                      <Text size="sm">
                        <strong>Confidence:</strong> {Math.round(imageVerification.confidence_score * 100)}%
                      </Text>
                      <Text size="sm" c="dimmed">
                        Verified: {new Date(imageVerification.verification_timestamp).toLocaleString()}
                      </Text>
                    </Group>
                    
                    <Text size="sm">{imageVerification.details}</Text>
                    
                    {imageVerification.detected_elements.length > 0 && (
                      <div>
                        <Text size="sm" fw={500} mb="xs">Detected Elements:</Text>
                        <Group gap="xs">
                          {imageVerification.detected_elements.map((element, index) => (
                            <Badge key={index} variant="light" size="sm">
                              {element}
                            </Badge>
                          ))}
                        </Group>
                      </div>
                    )}
                    
                    {imageVerification.manipulation_indicators.length > 0 && (
                      <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                        <Text size="sm" fw={500}>Manipulation Indicators:</Text>
                        <ul>
                          {imageVerification.manipulation_indicators.map((indicator, index) => (
                            <li key={index}>{indicator}</li>
                          ))}
                        </ul>
                      </Alert>
                    )}
                  </Stack>
                </Card>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </div>
  );
};

export default DisasterDetails;
