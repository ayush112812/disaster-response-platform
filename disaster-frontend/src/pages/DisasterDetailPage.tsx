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
  SimpleGrid 
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconAlertCircle, IconArrowLeft, IconMapPin, 
  IconCalendar, IconCalendarDue, 
  IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';
import { getDisaster, Disaster, ApiError } from '../services/api';

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

  return (
    <Container size="lg" py="xl">
      <Button 
        component={Link} 
        to="/disasters" 
        variant="light" 
        mb="xl"
        leftSection={<IconArrowLeft size={16} />}
      >
        Back to Disasters
      </Button>
      
      <Card shadow="sm" padding="xl" radius="md" withBorder>
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
            </Group>
          </div>
          
          <Button 
            variant="outline" 
            component={Link} 
            to={`/disasters/${disaster.id}/edit`}
          >
            Edit Details
          </Button>
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
    </Container>
  );
}

export default DisasterDetailPage;
