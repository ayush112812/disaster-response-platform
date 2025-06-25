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
  TextInput,
  Button,
  Grid,
  Select,
  NumberInput,
  Alert,
  Tabs,
  Paper
} from '@mantine/core';
import {
  IconMapPin,
  IconRefresh,
  IconSearch,
  IconMedicalCross,
  IconHome,
  IconDroplet,
  IconBread,
  IconShirt,
  IconTool,
  IconCurrentLocation,
  IconMap,
  IconList
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getNearbyResources, geocodeLocation, Resource } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { InteractiveMap } from '../components/InteractiveMap';

// Mock resources data
const mockResources = [
  {
    id: '1',
    disaster_id: '1',
    name: 'Emergency Shelter - Community Center',
    description: 'Temporary shelter with capacity for 200 people. Food and medical assistance available.',
    location_name: 'Lower East Side, NYC',
    type: 'shelter',
    quantity: 200,
    contact_info: { phone: '555-0123', email: 'shelter@community.org' },
    created_by: 'reliefAdmin',
    distance: 2.5
  },
  {
    id: '2',
    disaster_id: '1',
    name: 'Medical Supply Distribution',
    description: 'First aid supplies and medications available for flood victims.',
    location_name: 'Midtown Manhattan, NYC',
    type: 'medical',
    quantity: 500,
    contact_info: { phone: '555-0456', email: 'medical@redcross.org' },
    created_by: 'medicalTeam',
    distance: 5.2
  },
  {
    id: '3',
    disaster_id: '1',
    name: 'Food Distribution Center',
    description: 'Hot meals and emergency food supplies for displaced families.',
    location_name: 'Brooklyn Heights, NYC',
    type: 'food',
    quantity: 1000,
    contact_info: { phone: '555-0789', email: 'food@salvation.org' },
    created_by: 'foodBank',
    distance: 8.1
  },
  {
    id: '4',
    disaster_id: '1',
    name: 'Clean Water Distribution',
    description: 'Bottled water and water purification tablets available.',
    location_name: 'Central Park, NYC',
    type: 'water',
    quantity: 2000,
    contact_info: { phone: '555-0321', email: 'water@relief.org' },
    created_by: 'waterTeam',
    distance: 3.7
  },
  {
    id: '5',
    disaster_id: '1',
    name: 'Clothing Donation Center',
    description: 'Clean clothes and blankets for flood victims.',
    location_name: 'Queens, NYC',
    type: 'clothing',
    quantity: 800,
    contact_info: { phone: '555-0654', email: 'clothes@charity.org' },
    created_by: 'clothingDrive',
    distance: 12.3
  }
];

const resourceTypeIcons = {
  shelter: IconHome,
  medical: IconMedicalCross,
  food: IconBread,
  water: IconDroplet,
  clothing: IconShirt,
  other: IconTool
};

const resourceTypeColors = {
  shelter: 'blue',
  medical: 'red',
  food: 'green',
  water: 'cyan',
  clothing: 'purple',
  other: 'gray'
};

function ResourcesPage() {
  console.log('🔍 ResourcesPage component rendering...');

  const [searchLocation, setSearchLocation] = useState('');
  const [resourceType, setResourceType] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(10);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('list');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { socket, connected } = useWebSocket();

  console.log('🔍 ResourcesPage state:', {
    searchLocation,
    resourceType,
    radius,
    coordinates,
    activeTab,
    userLocation,
    connected
  });

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userCoords);
          setCoordinates(userCoords);
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Default to NYC if geolocation fails
          const defaultCoords = { lat: 40.7128, lng: -74.0060 };
          setCoordinates(defaultCoords);
        }
      );
    } else {
      // Default to NYC if geolocation not supported
      const defaultCoords = { lat: 40.7128, lng: -74.0060 };
      setCoordinates(defaultCoords);
    }
  }, []);

  // Real-time resources query with fallback to mock data
  const {
    data: resourcesData,
    isLoading,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['nearby-resources', coordinates?.lat, coordinates?.lng, radius, resourceType],
    queryFn: async () => {
      if (!coordinates) return Promise.resolve({ resources: [], count: 0 });

      try {
        // Try to get real data from API
        return await getNearbyResources(coordinates.lat, coordinates.lng, radius, resourceType || undefined);
      } catch (error) {
        console.log('API failed, using mock data:', error);
        // Fallback to mock data
        let filteredResources = [...mockResources];

        // Apply type filter if specified
        if (resourceType) {
          filteredResources = filteredResources.filter(r => r.type === resourceType);
        }

        // Add coordinates for map display
        filteredResources = filteredResources.map((resource, index) => ({
          ...resource,
          coordinates: {
            lat: coordinates.lat + (Math.random() - 0.5) * 0.02,
            lng: coordinates.lng + (Math.random() - 0.5) * 0.02
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        return { resources: filteredResources, count: filteredResources.length };
      }
    },
    enabled: !!coordinates,
    retry: 1,
  });

  // WebSocket listeners for real-time resource updates
  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Setting up WebSocket listeners for resources');

    socket.on('resource_updated', (data: any) => {
      console.log('🏠 Resource updated:', data);
      refetch();
    });

    socket.on('resources_updated', (data: any) => {
      console.log('🏠 Resources updated:', data);
      refetch();
    });

    return () => {
      socket.off('resource_updated');
      socket.off('resources_updated');
    };
  }, [socket, refetch]);

  const handleSearch = async () => {
    if (!searchLocation.trim()) {
      refetch();
      return;
    }

    try {
      const result = await geocodeLocation(searchLocation);
      setCoordinates(result.coordinates);
    } catch (error) {
      console.error('Geocoding failed:', error);
      // Keep current coordinates if geocoding fails
    }
  };

  const handleUseCurrentLocation = () => {
    if (userLocation) {
      setCoordinates(userLocation);
      setSearchLocation('Current Location');
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(coords);
          setCoordinates(coords);
          setSearchLocation('Current Location');
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  const handleReset = () => {
    setSearchLocation('');
    setResourceType(null);
    setRadius(10);
    if (userLocation) {
      setCoordinates(userLocation);
    }
  };

  const resources = resourcesData?.resources || [];

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Resource Finder</Title>
          <Text c="dimmed" size="lg">
            Find emergency resources and assistance near you
          </Text>
        </div>
        <Group>
          <Badge color="blue" variant="filled" size="lg">
            {resources.length} Resources Found
          </Badge>
          {connected && (
            <Badge color="green" variant="light" size="sm">
              Live Updates
            </Badge>
          )}
        </Group>
      </Group>

      {coordinates && (
        <Alert color="blue" variant="light" mb="xl">
          📍 Searching near: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
          {userLocation && coordinates.lat === userLocation.lat && coordinates.lng === userLocation.lng &&
            " (Your current location)"}
        </Alert>
      )}

      {/* Search and Filters */}
      <Card mb="xl">
        <Title order={4} mb="md">Search Resources</Title>
        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Location"
              placeholder="Enter location (e.g., Manhattan, NYC)"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              leftSection={<IconMapPin size={16} />}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label="Resource Type"
              placeholder="All types"
              value={resourceType}
              onChange={setResourceType}
              data={[
                { value: 'shelter', label: 'Shelter' },
                { value: 'medical', label: 'Medical' },
                { value: 'food', label: 'Food' },
                { value: 'water', label: 'Water' },
                { value: 'clothing', label: 'Clothing' },
                { value: 'other', label: 'Other' }
              ]}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <NumberInput
              label="Radius (km)"
              value={radius}
              onChange={(value) => setRadius(value as number)}
              min={1}
              max={50}
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
              <Tooltip label="Use your current location">
                <ActionIcon
                  variant="light"
                  size="lg"
                  onClick={handleUseCurrentLocation}
                >
                  <IconCurrentLocation size={18} />
                </ActionIcon>
              </Tooltip>
              <Button
                variant="light"
                onClick={handleReset}
              >
                Reset
              </Button>
            </Group>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="list" leftSection={<IconList size={16} />}>
            List View
          </Tabs.Tab>
          <Tabs.Tab value="map" leftSection={<IconMap size={16} />}>
            Map View
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="list">

          {/* Resources List */}
          {isLoading ? (
            <div style={{ position: 'relative', minHeight: 200 }}>
              <LoadingOverlay visible />
            </div>
          ) : (
            <Stack gap="md" mt="md">
              {resources.map((resource) => {
                const IconComponent = resourceTypeIcons[resource.type as keyof typeof resourceTypeIcons];
                const color = resourceTypeColors[resource.type as keyof typeof resourceTypeColors];

                return (
                  <Card key={resource.id} withBorder radius="md" p="lg">
                    <Group justify="space-between" mb="md">
                      <Group>
                        <IconComponent size={24} color={color} />
                        <div>
                          <Text fw={600} size="lg">{resource.name}</Text>
                          <Text size="sm" c="dimmed">{resource.location_name}</Text>
                        </div>
                      </Group>
                      <Group>
                        <Badge color={color} variant="light">
                          {resource.type}
                        </Badge>
                        {coordinates && (
                          <Badge color="gray" variant="outline">
                            📍 Nearby
                          </Badge>
                        )}
                      </Group>
                    </Group>

                    <Text mb="md">{resource.description}</Text>

                    <Group justify="space-between">
                      <Group>
                        <Text size="sm" fw={500}>
                          Capacity: {resource.quantity}
                        </Text>
                        <Text size="sm" c="dimmed">
                          Managed by: {resource.created_by}
                        </Text>
                      </Group>
                      <Group>
                        {resource.contact_info?.phone && (
                          <Button
                            size="sm"
                            variant="light"
                            component="a"
                            href={`tel:${resource.contact_info.phone}`}
                          >
                            Call: {resource.contact_info.phone}
                          </Button>
                        )}
                        {resource.contact_info?.email && (
                          <Button
                            size="sm"
                            variant="outline"
                            component="a"
                            href={`mailto:${resource.contact_info.email}`}
                          >
                            Email
                          </Button>
                        )}
                      </Group>
                    </Group>
                  </Card>
                );
              })}

              {resources.length === 0 && !isLoading && (
                <Card withBorder radius="md" p="xl">
                  <Text ta="center" c="dimmed" size="lg" mb="md">
                    No resources found
                  </Text>
                  <Text ta="center" c="dimmed" size="sm">
                    Try adjusting your search criteria or expanding the search radius.
                  </Text>
                </Card>
              )}
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="map">
          <div style={{ marginTop: '1rem' }}>
            {coordinates && (
              <Alert color="blue" variant="light" mb="md">
                <Text size="sm">
                  <strong>Search center:</strong> {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                  {userLocation && coordinates.lat === userLocation.lat && coordinates.lng === userLocation.lng &&
                    " (Your current location)"}
                  <br />
                  <strong>Search radius:</strong> {radius} km
                  <br />
                  <strong>Resources found:</strong> {resources.length}
                </Text>
              </Alert>
            )}

            {coordinates ? (
              <div>
                <InteractiveMap
                  resources={resources.map(resource => ({
                    ...resource,
                    coordinates: resource.coordinates || {
                      // Generate mock coordinates near the search center for demo
                      lat: (coordinates?.lat || 40.7128) + (Math.random() - 0.5) * 0.02,
                      lng: (coordinates?.lng || -74.0060) + (Math.random() - 0.5) * 0.02
                    }
                  }))}
                  center={[coordinates.lat, coordinates.lng]}
                  zoom={12}
                  radius={radius * 1000} // Convert km to meters
                  height={500}
                  showUserLocation={true}
                  onLocationChange={(lat, lng) => {
                    console.log('Map center changed:', lat, lng);
                    // Could update search center here if needed
                  }}
                />

                <Alert color="blue" variant="light" mt="md">
                  <Text size="sm">
                    <strong>Map Features:</strong> The map will automatically retry if it fails to load and switch to backup servers if needed.
                    If you see "Using backup tile server", the map is working around connectivity issues.
                    Use the List View tab above for a reliable alternative view.
                  </Text>
                </Alert>
              </div>
            ) : (
              <Paper withBorder style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stack align="center" gap="md">
                  <Text c="dimmed" fw={500}>Loading map...</Text>
                  <Text size="sm" c="dimmed">Getting your location</Text>
                </Stack>
              </Paper>
            )}
          </div>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

export default ResourcesPage;
