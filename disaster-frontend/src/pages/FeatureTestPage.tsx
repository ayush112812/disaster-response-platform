import React, { useState } from 'react';
import { 
  Card, Text, Button, Group, Stack, Badge, Tabs, Alert, 
  TextInput, Textarea, LoadingOverlay, Grid, Code, Divider,
  Select, NumberInput, ActionIcon, Timeline, Avatar, Anchor
} from '@mantine/core';
import { 
  IconMapPin, IconBrandTwitter, IconNews, IconPhoto, IconRefresh, 
  IconCheck, IconX, IconAlertTriangle, IconBuildingStore, IconPhone,
  IconWorld, IconExternalLink, IconClock, IconUsers
} from '@tabler/icons-react';

const FeatureTestPage: React.FC = () => {
  // State for testing each feature
  const [activeTab, setActiveTab] = useState('geocoding');
  
  // Geocoding & Disaster Creation
  const [description, setDescription] = useState('');
  const [geocodeResult, setGeocodeResult] = useState<any>(null);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  
  // Resource Lookup
  const [disasterId, setDisasterId] = useState('');
  const [resourceLat, setResourceLat] = useState<number | undefined>(40.7128);
  const [resourceLng, setResourceLng] = useState<number | undefined>(-74.0060);
  const [resourceRadius, setResourceRadius] = useState<number | undefined>(10000);
  const [resourceType, setResourceType] = useState<string | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  
  // Social Media
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  
  // Official Updates
  const [officialUpdates, setOfficialUpdates] = useState<any[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  
  // Image Verification
  const [imageUrl, setImageUrl] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [imageVerification, setImageVerification] = useState<any>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Example descriptions for geocoding
  const exampleDescriptions = [
    "There is severe flooding in Lower East Side, NYC.",
    "Major earthquake in San Francisco, buildings are shaking",
    "Wildfire spreading near Napa Valley, evacuation recommended",
    "Flash flooding in downtown Austin, Texas",
    "Hurricane approaching Miami Beach, Florida",
    "Tornado spotted in Moore, Oklahoma"
  ];

  const handleExampleClick = (example: string) => {
    setDescription(example);
    setGeocodeResult(null);
  };

  // Test Geocoding with Disaster Creation
  const testGeocoding = async () => {
    if (!description.trim()) return;
    
    try {
      setGeocodeLoading(true);
      const response = await fetch('/api/ingestion/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          createDisaster: true,
          userId: 'test_user'
        }),
      });
      
      const data = await response.json();
      setGeocodeResult(data);
      
      // Auto-populate disaster ID for other tests
      if (data.disaster_created && data.disaster_id) {
        setDisasterId(data.disaster_id);
      }
      
      // Auto-populate coordinates for resource search
      if (data.coordinates) {
        setResourceLat(data.coordinates.lat);
        setResourceLng(data.coordinates.lng);
      }
      
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setGeocodeLoading(false);
    }
  };

  // Test Resource Lookup
  const testResources = async () => {
    if (!disasterId.trim()) return;
    
    try {
      setResourcesLoading(true);
      const params = new URLSearchParams();
      if (resourceLat) params.append('lat', resourceLat.toString());
      if (resourceLng) params.append('lng', resourceLng.toString());
      if (resourceRadius) params.append('radius', resourceRadius.toString());
      if (resourceType) params.append('type', resourceType);
      
      const response = await fetch(`/api/disasters/${disasterId}/resources?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setResources(data.resources);
      }
    } catch (error) {
      console.error('Resources error:', error);
    } finally {
      setResourcesLoading(false);
    }
  };

  // Test Social Media
  const testSocialMedia = async () => {
    if (!disasterId.trim()) return;
    
    try {
      setSocialLoading(true);
      const response = await fetch(`/api/disasters/${disasterId}/social-media?limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setSocialPosts(data.social_media_posts);
      }
    } catch (error) {
      console.error('Social media error:', error);
    } finally {
      setSocialLoading(false);
    }
  };

  // Test Official Updates
  const testOfficialUpdates = async () => {
    if (!disasterId.trim()) return;
    
    try {
      setUpdatesLoading(true);
      const response = await fetch(`/api/disasters/${disasterId}/official-updates?limit=5`);
      const data = await response.json();
      
      if (data.success) {
        setOfficialUpdates(data.official_updates);
      }
    } catch (error) {
      console.error('Official updates error:', error);
    } finally {
      setUpdatesLoading(false);
    }
  };

  // Test Image Verification
  const testImageVerification = async () => {
    if (!disasterId.trim() || !imageUrl.trim()) return;
    
    try {
      setImageLoading(true);
      const response = await fetch(`/api/disasters/${disasterId}/verify-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      console.error('Image verification error:', error);
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <Stack gap="xl">
        <div>
          <Text size="xl" fw={700} mb="xs">🧪 Backend Features Test Page</Text>
          <Text c="dimmed">
            Test all four integrated backend features: Geocoding + Disaster Creation, 
            Geospatial Resource Lookup, Social Media Reports, Official Updates, and Image Verification
          </Text>
        </div>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="geocoding" leftSection={<IconMapPin size={16} />}>
              1. Geocoding + Create Disaster
            </Tabs.Tab>
            <Tabs.Tab value="resources" leftSection={<IconBuildingStore size={16} />}>
              2. Geospatial Resources
            </Tabs.Tab>
            <Tabs.Tab value="social" leftSection={<IconBrandTwitter size={16} />}>
              3. Social Media
            </Tabs.Tab>
            <Tabs.Tab value="official" leftSection={<IconNews size={16} />}>
              4. Official Updates
            </Tabs.Tab>
            <Tabs.Tab value="verify" leftSection={<IconPhoto size={16} />}>
              5. Image Verification
            </Tabs.Tab>
          </Tabs.List>

          {/* Geocoding + Disaster Creation Tab */}
          <Tabs.Panel value="geocoding" pt="md">
            <Card withBorder padding="lg">
              <Stack gap="md">
                <Text fw={500}>🌍 Step 1: Extract Location & Create Disaster</Text>
                <Text size="sm" c="dimmed">
                  This will use Gemini AI to extract location, geocode it to coordinates, 
                  create a disaster record, and find nearby resources automatically.
                </Text>
                
                <Textarea
                  label="Disaster Description"
                  placeholder="e.g., There is severe flooding in Lower East Side, NYC."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  minRows={3}
                />

                {/* Example Descriptions */}
                <Card withBorder padding="md" bg="blue.0" style={{ borderColor: '#e3f2fd' }}>
                  <Stack gap="sm">
                    <Text size="sm" fw={500} c="blue.8">📝 Example Descriptions</Text>
                    <Text size="xs" c="dimmed">
                      Click any example below to auto-fill the description field:
                    </Text>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '0.5rem'
                    }}>
                      {exampleDescriptions.map((example, index) => (
                        <Button
                          key={index}
                          variant="light"
                          size="sm"
                          color="blue"
                          onClick={() => handleExampleClick(example)}
                          style={{
                            textAlign: 'left',
                            justifyContent: 'flex-start',
                            height: 'auto',
                            padding: '0.75rem',
                            whiteSpace: 'normal'
                          }}
                          disabled={geocodeLoading}
                        >
                          "{example}"
                        </Button>
                      ))}
                    </div>
                  </Stack>
                </Card>

                <Button
                  onClick={testGeocoding}
                  loading={geocodeLoading}
                  leftSection={<IconMapPin size={16} />}
                  disabled={!description.trim()}
                >
                  Extract Location & Create Disaster
                </Button>
                
                {geocodeResult && (
                  <Card withBorder padding="md" bg="green.0">
                    <Stack gap="xs">
                      <Text fw={500} c="green.8">✅ Results:</Text>
                      <Text size="sm"><strong>Location:</strong> {geocodeResult.location_name}</Text>
                      {geocodeResult.coordinates && (
                        <Text size="sm">
                          <strong>Coordinates:</strong> {geocodeResult.coordinates.lat}, {geocodeResult.coordinates.lng}
                        </Text>
                      )}
                      {geocodeResult.disaster_created && (
                        <Text size="sm" c="green.8">
                          <strong>✅ Disaster Created:</strong> ID {geocodeResult.disaster_id}
                        </Text>
                      )}
                      {geocodeResult.nearby_count > 0 && (
                        <Text size="sm">
                          <strong>Nearby Resources:</strong> {geocodeResult.nearby_count} found
                        </Text>
                      )}
                      <Code block>{JSON.stringify(geocodeResult, null, 2)}</Code>
                    </Stack>
                  </Card>
                )}
              </Stack>
            </Card>
          </Tabs.Panel>

          {/* Geospatial Resources Tab */}
          <Tabs.Panel value="resources" pt="md">
            <Card withBorder padding="lg">
              <Stack gap="md">
                <Text fw={500}>🏪 Step 2: Find Nearby Resources (Geospatial Query)</Text>
                <Text size="sm" c="dimmed">
                  Uses PostGIS ST_DWithin to find resources within a radius of the disaster location.
                </Text>
                
                <Grid>
                  <Grid.Col span={6}>
                    <TextInput
                      label="Disaster ID"
                      placeholder="Enter disaster ID"
                      value={disasterId}
                      onChange={(e) => setDisasterId(e.target.value)}
                    />
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <NumberInput
                      label="Latitude"
                      value={resourceLat}
                      onChange={(value) => setResourceLat(Number(value))}
                      decimalScale={6}
                    />
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <NumberInput
                      label="Longitude"
                      value={resourceLng}
                      onChange={(value) => setResourceLng(Number(value))}
                      decimalScale={6}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Radius (meters)"
                      value={resourceRadius}
                      onChange={(value) => setResourceRadius(Number(value))}
                      min={100}
                      max={100000}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Select
                      label="Resource Type"
                      placeholder="All types"
                      value={resourceType}
                      onChange={setResourceType}
                      data={[
                        { value: 'shelter', label: 'Shelter' },
                        { value: 'hospital', label: 'Hospital' },
                        { value: 'food', label: 'Food' },
                        { value: 'water', label: 'Water' },
                        { value: 'medical', label: 'Medical' },
                        { value: 'transport', label: 'Transport' }
                      ]}
                      clearable
                    />
                  </Grid.Col>
                </Grid>
                
                <Button 
                  onClick={testResources}
                  loading={resourcesLoading}
                  leftSection={<IconBuildingStore size={16} />}
                  disabled={!disasterId.trim()}
                >
                  Find Nearby Resources
                </Button>
                
                {resources.length > 0 && (
                  <Stack gap="xs">
                    <Text fw={500}>📍 Found {resources.length} Resources:</Text>
                    {resources.map((resource, index) => (
                      <Card key={index} withBorder padding="sm">
                        <Group justify="space-between">
                          <div>
                            <Text fw={500}>{resource.name}</Text>
                            <Group gap="xs">
                              <Badge variant="light">{resource.type}</Badge>
                              <Badge color={getAvailabilityColor(resource.availability)}>
                                {resource.availability}
                              </Badge>
                              <Text size="sm" c="dimmed">
                                {Math.round(resource.distance_meters / 1000 * 10) / 10} km away
                              </Text>
                            </Group>
                            <Text size="sm">{resource.address}</Text>
                          </div>
                          <Group gap="xs">
                            <IconPhone size={14} />
                            <Text size="sm">{resource.contact}</Text>
                          </Group>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Card>
          </Tabs.Panel>

          {/* Social Media Tab */}
          <Tabs.Panel value="social" pt="md">
            <Card withBorder padding="lg">
              <Stack gap="md">
                <Text fw={500}>🐦 Step 3: Social Media Reports (Mock Twitter API)</Text>
                <Text size="sm" c="dimmed">
                  Simulates fetching social media posts related to the disaster from Twitter/Bluesky.
                </Text>
                
                <Group>
                  <TextInput
                    label="Disaster ID"
                    placeholder="Enter disaster ID"
                    value={disasterId}
                    onChange={(e) => setDisasterId(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button 
                    onClick={testSocialMedia}
                    loading={socialLoading}
                    leftSection={<IconBrandTwitter size={16} />}
                    disabled={!disasterId.trim()}
                    mt="xl"
                  >
                    Load Social Posts
                  </Button>
                </Group>
                
                {socialPosts.length > 0 && (
                  <Timeline active={socialPosts.length} bulletSize={24} lineWidth={2}>
                    {socialPosts.map((post, index) => (
                      <Timeline.Item
                        key={index}
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
                          {post.hashtags.map((tag: string, tagIndex: number) => (
                            <Badge key={tagIndex} size="xs" variant="light">
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
                )}
              </Stack>
            </Card>
          </Tabs.Panel>

          {/* Official Updates Tab */}
          <Tabs.Panel value="official" pt="md">
            <Card withBorder padding="lg">
              <Stack gap="md">
                <Text fw={500}>📰 Step 4: Official Updates (Web Scraping Simulation)</Text>
                <Text size="sm" c="dimmed">
                  Simulates scraping official updates from FEMA, Red Cross, and government sites.
                </Text>
                
                <Group>
                  <TextInput
                    label="Disaster ID"
                    placeholder="Enter disaster ID"
                    value={disasterId}
                    onChange={(e) => setDisasterId(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button 
                    onClick={testOfficialUpdates}
                    loading={updatesLoading}
                    leftSection={<IconNews size={16} />}
                    disabled={!disasterId.trim()}
                    mt="xl"
                  >
                    Load Official Updates
                  </Button>
                </Group>
                
                {officialUpdates.length > 0 && (
                  <Stack gap="md">
                    {officialUpdates.map((update, index) => (
                      <Card key={index} withBorder padding="md">
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
                )}
              </Stack>
            </Card>
          </Tabs.Panel>

          {/* Image Verification Tab */}
          <Tabs.Panel value="verify" pt="md">
            <Card withBorder padding="lg">
              <Stack gap="md">
                <Text fw={500}>📸 Step 5: Image Verification (Gemini AI)</Text>
                <Text size="sm" c="dimmed">
                  Uses Gemini AI to verify if images are authentic and match the disaster context.
                </Text>
                
                <Grid>
                  <Grid.Col span={12}>
                    <TextInput
                      label="Disaster ID"
                      placeholder="Enter disaster ID"
                      value={disasterId}
                      onChange={(e) => setDisasterId(e.target.value)}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <TextInput
                      label="Image URL"
                      placeholder="https://example.com/disaster-image.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <TextInput
                      label="Description (optional)"
                      placeholder="Describe what the image should show..."
                      value={imageDescription}
                      onChange={(e) => setImageDescription(e.target.value)}
                    />
                  </Grid.Col>
                </Grid>
                
                <Button 
                  onClick={testImageVerification}
                  loading={imageLoading}
                  leftSection={<IconPhoto size={16} />}
                  disabled={!disasterId.trim() || !imageUrl.trim()}
                >
                  Verify Image with Gemini AI
                </Button>
                
                {imageVerification && (
                  <Card withBorder padding="md" bg={imageVerification.error ? "red.0" : "blue.0"}>
                    <Stack gap="md">
                      <Group justify="space-between">
                        <Text fw={500}>
                          {imageVerification.error ? '❌ Verification Failed' : '🤖 Gemini AI Verification Results'}
                        </Text>
                        {!imageVerification.error && (
                          <Group gap="xs">
                            <Badge color={imageVerification.is_authentic === null ? 'gray' : (imageVerification.is_authentic ? 'green' : 'red')}>
                              {imageVerification.is_authentic === null ? 'Unknown' : (imageVerification.is_authentic ? 'Authentic' : 'Suspicious')}
                            </Badge>
                            <Badge color={imageVerification.matches_disaster_type === null ? 'gray' : (imageVerification.matches_disaster_type ? 'green' : 'orange')}>
                              {imageVerification.matches_disaster_type === null ? 'Unknown' : (imageVerification.matches_disaster_type ? 'Matches Type' : 'Type Mismatch')}
                            </Badge>
                          </Group>
                        )}
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
                            {imageVerification.detected_elements.map((element: string, index: number) => (
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
                            {imageVerification.manipulation_indicators.map((indicator: string, index: number) => (
                              <li key={index}>{indicator}</li>
                            ))}
                          </ul>
                        </Alert>
                      )}
                    </Stack>
                  </Card>
                )}
              </Stack>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </div>
  );
};

export default FeatureTestPage;
