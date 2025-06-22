import {
  Title,
  Text,
  LoadingOverlay,
  Card,
  Group,
  Badge,
  Alert,
  Button,
  Container,
  Stack,
  TextInput,
  Select,
  MultiSelect,
  Grid,
  ActionIcon,
  Tooltip,
  NumberInput,
  Tabs,
  Paper,
  Divider
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  IconAlertCircle,
  IconSearch,
  IconFilter,
  IconRefresh,
  IconMapPin,
  IconCurrentLocation,
  IconPlus,
  IconList,
  IconMap,
  IconCalendar
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { getDisasters, getNearbyDisasters, geocodeLocation, Disaster, ApiError } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

const severityColors = {
  low: 'blue',
  medium: 'yellow',
  high: 'red',
} as const;

function DisastersPage() {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number>(50);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { socket, connected } = useWebSocket();

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
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  }, []);

  // Main disasters query
  const {
    data: disasters,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery<Disaster[], ApiError>({
    queryKey: ['disasters'],
    queryFn: getDisasters,
    retry: 2,
  });

  // Nearby disasters query (when location search is active)
  const {
    data: nearbyDisastersData,
    isLoading: nearbyLoading,
    refetch: refetchNearby
  } = useQuery({
    queryKey: ['nearby-disasters', coordinates?.lat, coordinates?.lng, radius],
    queryFn: () => {
      if (!coordinates) return Promise.resolve({ disasters: [], count: 0 });
      return getNearbyDisasters(coordinates.lat, coordinates.lng, radius);
    },
    enabled: !!coordinates,
    retry: 1,
  });

  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Setting up WebSocket listeners for disasters');

    socket.on('disaster_updated', (data: any) => {
      console.log('🚨 Disaster updated:', data);
      refetch();
      if (coordinates) refetchNearby();
    });

    socket.on('disaster_created', (data: any) => {
      console.log('🚨 New disaster created:', data);
      refetch();
      if (coordinates) refetchNearby();
    });

    return () => {
      socket.off('disaster_updated');
      socket.off('disaster_created');
    };
  }, [socket, refetch, refetchNearby, coordinates]);

  // Handle location search
  const handleLocationSearch = async () => {
    if (!locationSearch.trim()) {
      setCoordinates(null);
      return;
    }

    try {
      const result = await geocodeLocation(locationSearch);
      setCoordinates(result.coordinates);
    } catch (error) {
      console.error('Geocoding failed:', error);
    }
  };

  const handleUseCurrentLocation = () => {
    if (userLocation) {
      setCoordinates(userLocation);
      setLocationSearch('Current Location');
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(coords);
          setCoordinates(coords);
          setLocationSearch('Current Location');
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  // Get the appropriate disaster list
  const allDisasters = coordinates && nearbyDisastersData
    ? nearbyDisastersData.disasters
    : disasters || [];

  // Filter disasters based on search criteria
  const filteredDisasters = allDisasters.filter(disaster => {
    const matchesSearch = !searchQuery ||
      disaster.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      disaster.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      disaster.location_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = !severityFilter || disaster.severity === severityFilter;
    const matchesStatus = !statusFilter || disaster.status === statusFilter;
    const matchesTags = tagFilter.length === 0 ||
      tagFilter.some(tag => disaster.tags.includes(tag));

    return matchesSearch && matchesSeverity && matchesStatus && matchesTags;
  });

  // Sort disasters
  const sortedDisasters = [...filteredDisasters].sort((a, b) => {
    switch (sortBy) {
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'severity':
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  // Get all unique tags for filtering
  const allTags = Array.from(new Set(allDisasters.flatMap(d => d.tags)));

  // Group disasters by status
  const activeDisasters = sortedDisasters.filter(d => d.status === 'reported' || d.status === 'verified' || d.status === 'in_progress');
  const resolvedDisasters = sortedDisasters.filter(d => d.status === 'resolved');
  const falseAlarmDisasters = sortedDisasters.filter(d => d.status === 'false_alarm');

  if (isLoading && !isRefetching) {
    return (
      <Container size="xl" py="xl">
        <div style={{ position: 'relative', minHeight: 200 }}>
          <LoadingOverlay visible={true} />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Error loading disasters"
          color="red"
          my="md"
        >
          {error.message}
          <Button onClick={() => refetch()} variant="light" size="sm" mt="md">
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }


  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Disaster Management</Title>
          <Text c="dimmed" size="lg">
            Search, filter, and manage disaster reports
          </Text>
        </div>
        <Group>
          <Badge color="blue" variant="filled" size="lg">
            {sortedDisasters.length} Disasters
          </Badge>
          {connected && (
            <Badge color="green" variant="light" size="sm">
              Live Updates
            </Badge>
          )}
          <Button
            component={Link}
            to="/disasters/new"
            leftSection={<IconPlus size={16} />}
          >
            Report Disaster
          </Button>
        </Group>
      </Group>

      {/* Advanced Search and Filters */}
      <Card mb="xl">
        <Title order={4} mb="md">Search & Filters</Title>
        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Search"
              placeholder="Search disasters by title, description, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<IconSearch size={16} />}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Select
              label="Severity"
              placeholder="All severities"
              value={severityFilter}
              onChange={setSeverityFilter}
              data={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' }
              ]}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Select
              label="Status"
              placeholder="All statuses"
              value={statusFilter}
              onChange={setStatusFilter}
              data={[
                { value: 'reported', label: 'Reported' },
                { value: 'verified', label: 'Verified' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'false_alarm', label: 'False Alarm' }
              ]}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Select
              label="Sort By"
              value={sortBy}
              onChange={setSortBy}
              data={[
                { value: 'created_at', label: 'Date Created' },
                { value: 'severity', label: 'Severity' },
                { value: 'title', label: 'Title' }
              ]}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Group mt="xl">
              <Tooltip label="Refresh disasters">
                <ActionIcon
                  variant="light"
                  size="lg"
                  onClick={() => {
                    refetch();
                    if (coordinates) refetchNearby();
                  }}
                  loading={isRefetching || nearbyLoading}
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Grid.Col>
        </Grid>

        <Divider my="md" />

        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <MultiSelect
              label="Filter by Tags"
              placeholder="Select tags..."
              value={tagFilter}
              onChange={setTagFilter}
              data={allTags.map(tag => ({ value: tag, label: tag }))}
              searchable
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Location Search"
              placeholder="Enter location for nearby disasters..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              leftSection={<IconMapPin size={16} />}
              onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch()}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <NumberInput
              label="Radius (km)"
              value={radius}
              onChange={(value) => setRadius(value as number)}
              min={1}
              max={200}
              disabled={!coordinates}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Group mt="xl">
              <Button
                onClick={handleLocationSearch}
                disabled={!locationSearch.trim()}
                size="sm"
                variant="light"
              >
                Search Location
              </Button>
              <Tooltip label="Use current location">
                <ActionIcon
                  variant="light"
                  size="lg"
                  onClick={handleUseCurrentLocation}
                >
                  <IconCurrentLocation size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Grid.Col>
        </Grid>

        {coordinates && (
          <Alert color="blue" variant="light" mt="md">
            📍 Showing disasters near: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
            within {radius} km radius
            {userLocation && coordinates.lat === userLocation.lat && coordinates.lng === userLocation.lng &&
              " (Your current location)"}
          </Alert>
        )}
      </Card>
      {/* Tabbed Interface */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="all" leftSection={<IconList size={16} />}>
            All Disasters ({sortedDisasters.length})
          </Tabs.Tab>
          <Tabs.Tab value="active" leftSection={<IconAlertCircle size={16} />}>
            Active ({activeDisasters.length})
          </Tabs.Tab>
          <Tabs.Tab value="resolved" leftSection={<IconCalendar size={16} />}>
            Resolved ({resolvedDisasters.length})
          </Tabs.Tab>
          <Tabs.Tab value="false_alarm" leftSection={<IconFilter size={16} />}>
            False Alarms ({falseAlarmDisasters.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="all">
          {renderDisasterList(sortedDisasters)}
        </Tabs.Panel>

        <Tabs.Panel value="active">
          {renderDisasterList(activeDisasters)}
        </Tabs.Panel>

        <Tabs.Panel value="resolved">
          {renderDisasterList(resolvedDisasters)}
        </Tabs.Panel>

        <Tabs.Panel value="false_alarm">
          {renderDisasterList(falseAlarmDisasters)}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );

  function renderDisasterList(disasterList: Disaster[]) {
    if (isLoading || nearbyLoading) {
      return (
        <div style={{ position: 'relative', minHeight: 200 }}>
          <LoadingOverlay visible />
        </div>
      );
    }

    if (disasterList.length === 0) {
      return (
        <Card withBorder radius="md" p="xl" mt="md">
          <Text ta="center" c="dimmed" size="lg" mb="md">
            No disasters found
          </Text>
          <Text ta="center" c="dimmed" size="sm">
            {coordinates
              ? `No disasters found within ${radius} km of the selected location.`
              : 'Try adjusting your search criteria or filters.'
            }
          </Text>
        </Card>
      );
    }

    return (
      <Stack gap="md" mt="md">
        {disasterList.map((disaster) => (
          <Card
            key={disaster.id}
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            component={Link}
            to={`/disasters/${disaster.id}`}
            style={{
              textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <Group justify="space-between" mb="xs" wrap="nowrap">
              <Text fw={600} size="lg" lineClamp={1}>
                {disaster.title}
              </Text>
              <Group gap="xs">
                <Badge
                  color={severityColors[disaster.severity]}
                  variant="filled"
                  size="lg"
                  radius="sm"
                >
                  {disaster.severity.charAt(0).toUpperCase() + disaster.severity.slice(1)}
                </Badge>
                <Badge
                  color={disaster.status === 'resolved' ? 'green' : disaster.status === 'false_alarm' ? 'gray' : 'blue'}
                  variant="light"
                  size="sm"
                >
                  {disaster.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </Group>
            </Group>

            <Group gap="sm" mb="xs">
              <Text size="sm" c="dimmed">
                📍 {disaster.location_name}
              </Text>
              <Text size="sm" c="dimmed">
                👤 {disaster.owner_id}
              </Text>
            </Group>

            <Text size="sm" lineClamp={2} mb="sm">
              {disaster.description}
            </Text>

            {disaster.tags && disaster.tags.length > 0 && (
              <Group gap="xs" mb="sm">
                {disaster.tags.map((tag, index) => (
                  <Badge key={index} variant="light" size="sm">
                    #{tag}
                  </Badge>
                ))}
              </Group>
            )}

            <Group justify="space-between" gap="xs">
              <Text size="xs" c="dimmed">
                🕒 {new Date(disaster.created_at).toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                📝 Updated: {new Date(disaster.updated_at).toLocaleString()}
              </Text>
            </Group>
          </Card>
        ))}
      </Stack>
    );
  }
}

export default DisastersPage;
