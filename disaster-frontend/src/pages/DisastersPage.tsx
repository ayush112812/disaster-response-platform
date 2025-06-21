import { Title, Text, LoadingOverlay, Card, Group, Badge, Alert, Button } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { IconAlertCircle } from '@tabler/icons-react';
import { getDisasters, Disaster, ApiError } from '../services/api';

const severityColors = {
  low: 'blue',
  medium: 'yellow',
  high: 'red',
} as const;

function DisastersPage() {
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

  if (isLoading && !isRefetching) {
    return (
      <div style={{ position: 'relative', minHeight: 200 }}>
        <LoadingOverlay visible={true} />
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }


  return (
    <div>
      <Group justify="space-between" mb="md">
        <Title order={2}>Active Disasters</Title>
        <Button 
          component={Link} 
          to="/disasters/new" 
          variant="filled"
          loading={isRefetching}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </Group>
      
      {disasters?.map((disaster) => (
        <Card 
          key={disaster.id} 
          shadow="sm" 
          padding="lg" 
          radius="md" 
          withBorder 
          mb="md"
          component={Link}
          to={`/disasters/${disaster.id}`}
          style={{ 
            textDecoration: 'none',
            transition: 'transform 0.2s, box-shadow 0.2s',
            ':hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
          }}
        >
          <Group justify="space-between" mb="xs" wrap="nowrap">
            <Text fw={600} size="lg" lineClamp={1}>
              {disaster.name}
            </Text>
            <Badge 
              color={severityColors[disaster.severity]}
              variant="filled"
              size="lg"
              radius="sm"
            >
              {disaster.severity.charAt(0).toUpperCase() + disaster.severity.slice(1)}
            </Badge>
          </Group>
          
          <Group gap="sm" mb="xs">
            <Text size="sm" color="dimmed">
              <strong>Location:</strong> {disaster.location}
            </Text>
            <Text size="sm" color="dimmed">
              <strong>Status:</strong> {disaster.status}
            </Text>
          </Group>
          
          <Text size="sm" lineClamp={2}>
            {disaster.description}
          </Text>
          
          <Group justify="space-between" mt="md" gap="xs">
            <Text size="xs" color="dimmed">
              Started: {new Date(disaster.startDate).toLocaleDateString()}
            </Text>
            {disaster.endDate && (
              <Text size="xs" color="dimmed">
                Ended: {new Date(disaster.endDate).toLocaleDateString()}
              </Text>
            )}
          </Group>
        </Card>
      ))}
      
      {!isLoading && (!disasters || disasters.length === 0) && (
        <Card withBorder radius="md" p="xl">
          <Text ta="center" c="dimmed" size="lg" mb="md">
            No active disasters found
          </Text>
          <Text ta="center" c="dimmed" size="sm">
            There are currently no active disasters to display.
          </Text>
        </Card>
      )}
    </div>
  );
}

export default DisastersPage;
