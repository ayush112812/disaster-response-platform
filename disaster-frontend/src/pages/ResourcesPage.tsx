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
  NumberInput
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
  IconTool
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

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
  const [searchLocation, setSearchLocation] = useState('');
  const [resourceType, setResourceType] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  
  const [filteredResources, setFilteredResources] = useState(mockResources);

  const handleSearch = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      let filtered = [...mockResources];
      
      if (searchLocation) {
        filtered = filtered.filter(resource => 
          resource.location_name.toLowerCase().includes(searchLocation.toLowerCase())
        );
      }
      
      if (resourceType) {
        filtered = filtered.filter(resource => resource.type === resourceType);
      }
      
      // Filter by radius
      filtered = filtered.filter(resource => resource.distance <= radius);
      
      // Sort by distance
      filtered.sort((a, b) => a.distance - b.distance);
      
      setFilteredResources(filtered);
      setIsLoading(false);
    }, 500);
  };

  const handleReset = () => {
    setSearchLocation('');
    setResourceType(null);
    setRadius(10);
    setFilteredResources(mockResources);
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Resource Finder</Title>
          <Text c="dimmed" size="lg">
            Find emergency resources and assistance near you
          </Text>
        </div>
        <Badge color="blue" variant="filled" size="lg">
          {filteredResources.length} Resources Found
        </Badge>
      </Group>

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
                loading={isLoading}
                leftSection={<IconSearch size={16} />}
              >
                Search
              </Button>
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

      {/* Resources List */}
      {isLoading ? (
        <div style={{ position: 'relative', minHeight: 200 }}>
          <LoadingOverlay visible />
        </div>
      ) : (
        <Stack gap="md">
          {filteredResources.map((resource) => {
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
                    <Badge color="gray" variant="outline">
                      {resource.distance} km away
                    </Badge>
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
          
          {filteredResources.length === 0 && (
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
    </Container>
  );
}

export default ResourcesPage;
