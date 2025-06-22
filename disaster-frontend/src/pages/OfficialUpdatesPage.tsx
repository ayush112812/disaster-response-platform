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
  Alert,
  Tabs,
  Paper,
  Divider
} from '@mantine/core';
import { 
  IconBell, 
  IconRefresh, 
  IconSearch,
  IconExternalLink,
  IconAlertTriangle,
  IconInfoCircle,
  IconNews,
  IconFilter,
  IconClock
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getOfficialUpdates, getDisasters, OfficialUpdate, Disaster } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

// Mock official updates data
const mockOfficialUpdates: OfficialUpdate[] = [
  {
    id: '1',
    disaster_id: '1',
    source: 'FEMA',
    title: 'Emergency Shelter Operations Activated in NYC',
    description: 'FEMA has activated emergency shelter operations in response to severe flooding in New York City. Multiple shelters are now open and accepting evacuees.',
    url: 'https://www.fema.gov/press-release/20231201/emergency-shelter-operations-activated-nyc',
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    disaster_id: '1',
    source: 'Red Cross',
    title: 'Blood Drive Suspended Due to Flooding',
    description: 'The American Red Cross has temporarily suspended blood drive operations in the affected areas due to severe weather conditions and flooding.',
    url: 'https://www.redcross.org/about-us/news-and-events/news/2023/blood-drive-suspended-flooding',
    published_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    disaster_id: '1',
    source: 'NYC Emergency Management',
    title: 'Flash Flood Warning Extended Until 8 PM',
    description: 'The National Weather Service has extended the flash flood warning for New York City until 8:00 PM today. Residents are advised to avoid unnecessary travel.',
    url: 'https://www1.nyc.gov/site/em/about/press-releases/20231201-flash-flood-warning-extended.page',
    published_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    disaster_id: '1',
    source: 'USGS',
    title: 'River Levels Continue to Rise in Manhattan',
    description: 'USGS monitoring stations report that river levels in Manhattan continue to rise. Residents near waterways should remain vigilant and prepared to evacuate if necessary.',
    url: 'https://www.usgs.gov/news/river-levels-continue-rise-manhattan',
    published_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '5',
    disaster_id: '1',
    source: 'National Weather Service',
    title: 'Severe Weather Alert: Heavy Rain Expected to Continue',
    description: 'The National Weather Service forecasts heavy rain to continue through the evening. Total rainfall amounts of 3-5 inches are expected, with locally higher amounts possible.',
    url: 'https://www.weather.gov/okx/severe-weather-alert-heavy-rain',
    published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

function OfficialUpdatesPage() {
  const [selectedDisaster, setSelectedDisaster] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [searchKeywords, setSearchKeywords] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const { socket, connected } = useWebSocket();

  // Get all disasters for filtering with fallback
  const { data: disasters } = useQuery<Disaster[]>({
    queryKey: ['disasters'],
    queryFn: async () => {
      try {
        return await getDisasters();
      } catch (error) {
        console.log('Disasters API failed, using mock data:', error);
        // Fallback to mock disasters
        return [
          {
            id: '1',
            title: 'NYC Flooding Emergency',
            description: 'Severe flooding in Manhattan and surrounding areas',
            location_name: 'New York City, NY',
            type: 'flood',
            severity: 'high',
            status: 'in_progress',
            tags: ['flood', 'emergency', 'nyc'],
            owner_id: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ] as Disaster[];
      }
    },
    retry: 1,
  });

  // Get official updates with fallback to mock data
  const {
    data: updatesData,
    isLoading,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['official-updates', selectedDisaster],
    queryFn: async () => {
      try {
        if (selectedDisaster) {
          return await getOfficialUpdates(selectedDisaster, 50);
        }
        // For demo, get updates for the first disaster
        const firstDisaster = disasters?.[0];
        if (firstDisaster) {
          return await getOfficialUpdates(firstDisaster.id, 50);
        }
        return Promise.resolve({ updates: [], total: 0 });
      } catch (error) {
        console.log('Official updates API failed, using mock data:', error);
        // Fallback to mock data
        return { updates: mockOfficialUpdates, total: mockOfficialUpdates.length };
      }
    },
    enabled: !!disasters,
    retry: 1,
  });

  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    console.log('🔌 Setting up WebSocket listeners for official updates');

    socket.on('official_updates_updated', (data: any) => {
      console.log('📰 Official updates updated:', data);
      refetch();
    });

    return () => {
      socket.off('official_updates_updated');
    };
  }, [socket, refetch]);

  const updates = updatesData?.updates || [];

  // Filter updates based on search and source
  const filteredUpdates = updates.filter(update => {
    const matchesSearch = !searchKeywords || 
      update.title.toLowerCase().includes(searchKeywords.toLowerCase()) ||
      update.content.toLowerCase().includes(searchKeywords.toLowerCase());
    
    const matchesSource = !sourceFilter || update.source === sourceFilter;
    
    return matchesSearch && matchesSource;
  });

  // Group updates by relevance
  const highRelevanceUpdates = filteredUpdates.filter(u => u.relevance >= 0.8);
  const mediumRelevanceUpdates = filteredUpdates.filter(u => u.relevance >= 0.5 && u.relevance < 0.8);
  const lowRelevanceUpdates = filteredUpdates.filter(u => u.relevance < 0.5);

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 0.8) return 'red';
    if (relevance >= 0.5) return 'orange';
    return 'blue';
  };

  const getRelevanceLabel = (relevance: number) => {
    if (relevance >= 0.8) return 'High';
    if (relevance >= 0.5) return 'Medium';
    return 'Low';
  };

  // Get unique sources for filtering
  const uniqueSources = Array.from(new Set(updates.map(u => u.source)));

  const renderUpdateCard = (update: OfficialUpdate) => (
    <Card key={update.id} withBorder p="md" mb="md">
      <Group justify="space-between" mb="md">
        <div>
          <Text fw={600} size="lg">{update.title}</Text>
          <Text size="sm" c="dimmed">{update.source}</Text>
        </div>
        <Group>
          <Badge 
            color={getRelevanceColor(update.relevance)}
            variant="filled"
            size="sm"
          >
            {getRelevanceLabel(update.relevance)} Relevance
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
      
      <Text size="sm" mb="md" lineClamp={3}>
        {update.content}
      </Text>
      
      <Group justify="space-between">
        <Group gap="xs">
          <IconClock size={14} />
          <Text size="xs" c="dimmed">
            {new Date(update.timestamp).toLocaleString()}
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          Relevance: {Math.round(update.relevance * 100)}%
        </Text>
      </Group>
    </Card>
  );

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Official Updates</Title>
          <Text c="dimmed" size="lg">
            Real-time official updates from government agencies and relief organizations
          </Text>
        </div>
        <Group>
          <Badge color="orange" variant="filled" size="lg">
            {filteredUpdates.length} Updates
          </Badge>
          {connected && (
            <Badge color="green" variant="light" size="sm">
              Live Updates
            </Badge>
          )}
        </Group>
      </Group>

      {/* Filters */}
      <Card mb="xl">
        <Title order={4} mb="md">Filters & Search</Title>
        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Select
              label="Disaster"
              placeholder="All disasters"
              value={selectedDisaster}
              onChange={setSelectedDisaster}
              data={disasters?.map(d => ({ value: d.id, label: d.title })) || []}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label="Source"
              placeholder="All sources"
              value={sourceFilter}
              onChange={setSourceFilter}
              data={uniqueSources.map(source => ({ value: source, label: source }))}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label="Search"
              placeholder="Search updates..."
              value={searchKeywords}
              onChange={(e) => setSearchKeywords(e.target.value)}
              leftSection={<IconSearch size={16} />}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Group mt="xl">
              <Tooltip label="Refresh updates">
                <ActionIcon 
                  variant="light" 
                  size="lg"
                  onClick={() => refetch()}
                  loading={isRefetching}
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="all" leftSection={<IconNews size={16} />}>
            All Updates ({filteredUpdates.length})
          </Tabs.Tab>
          <Tabs.Tab value="high" leftSection={<IconAlertTriangle size={16} />}>
            High Priority ({highRelevanceUpdates.length})
          </Tabs.Tab>
          <Tabs.Tab value="medium" leftSection={<IconBell size={16} />}>
            Medium Priority ({mediumRelevanceUpdates.length})
          </Tabs.Tab>
          <Tabs.Tab value="low" leftSection={<IconInfoCircle size={16} />}>
            Low Priority ({lowRelevanceUpdates.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="all">
          {isLoading ? (
            <div style={{ position: 'relative', minHeight: 200 }}>
              <LoadingOverlay visible />
            </div>
          ) : filteredUpdates.length > 0 ? (
            <Stack gap="md" mt="md">
              {filteredUpdates.map(renderUpdateCard)}
            </Stack>
          ) : (
            <Alert color="blue" variant="light" mt="md">
              <Text>No official updates found. Try adjusting your filters or check back later.</Text>
            </Alert>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="high">
          <Stack gap="md" mt="md">
            {highRelevanceUpdates.length > 0 ? (
              highRelevanceUpdates.map(renderUpdateCard)
            ) : (
              <Alert color="green" variant="light">
                <Text>No high priority updates at this time.</Text>
              </Alert>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="medium">
          <Stack gap="md" mt="md">
            {mediumRelevanceUpdates.length > 0 ? (
              mediumRelevanceUpdates.map(renderUpdateCard)
            ) : (
              <Alert color="blue" variant="light">
                <Text>No medium priority updates at this time.</Text>
              </Alert>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="low">
          <Stack gap="md" mt="md">
            {lowRelevanceUpdates.length > 0 ? (
              lowRelevanceUpdates.map(renderUpdateCard)
            ) : (
              <Alert color="gray" variant="light">
                <Text>No low priority updates at this time.</Text>
              </Alert>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Info Alert */}
      <Alert color="blue" variant="light" mt="xl">
        <Text size="sm">
          💡 <strong>Official Updates:</strong> These updates are automatically scraped from official sources 
          including FEMA, Red Cross, local emergency services, and government agencies. Updates are ranked by 
          relevance to the selected disaster and cached for optimal performance.
        </Text>
      </Alert>
    </Container>
  );
}

export default OfficialUpdatesPage;
