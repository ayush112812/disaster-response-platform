import { 
  Title, 
  Text, 
  Container, 
  Card, 
  Group, 
  Button,
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  Stack,
  Alert,
  LoadingOverlay
} from '@mantine/core';
import { 
  IconAlertTriangle, 
  IconMapPin, 
  IconArrowLeft,
  IconCheck,
  IconEdit
} from '@tabler/icons-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDisaster, updateDisaster } from '../services/api';

function EditDisasterPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location_name: '',
    severity: 'medium' as 'low' | 'medium' | 'high',
    status: 'active' as 'active' | 'resolved' | 'monitoring',
    tags: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch disaster data
  const { data: disaster, isLoading, error } = useQuery({
    queryKey: ['disaster', id],
    queryFn: () => getDisaster(id!),
    enabled: !!id,
    retry: 1,
  });

  // Update form data when disaster is loaded
  useEffect(() => {
    if (disaster) {
      setFormData({
        title: disaster.title || '',
        description: disaster.description || '',
        location_name: disaster.location_name || '',
        severity: disaster.severity || 'medium',
        status: disaster.status === 'resolved' ? 'resolved' : disaster.status === 'in_progress' ? 'monitoring' : 'active',
        tags: disaster.tags || []
      });
    }
  }, [disaster]);

  const updateDisasterMutation = useMutation({
    mutationFn: (data: any) => updateDisaster(id!, data),
    onSuccess: (data) => {
      // Invalidate and refetch disasters
      queryClient.invalidateQueries({ queryKey: ['disasters'] });
      queryClient.invalidateQueries({ queryKey: ['disaster', id] });
      
      // Show success notification
      alert('Disaster updated successfully!');
      
      // Navigate back to disaster detail page
      navigate(`/disasters/${id}`);
    },
    onError: (error: any) => {
      console.error('Error updating disaster:', error);
      alert('Failed to update disaster. Please try again.');
    }
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.location_name.trim()) {
      newErrors.location_name = 'Location is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    updateDisasterMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const commonTags = [
    'flood', 'earthquake', 'fire', 'hurricane', 'tornado', 'wildfire',
    'emergency', 'evacuation', 'medical', 'shelter', 'food', 'water',
    'power outage', 'transportation', 'communication', 'urgent'
  ];

  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <div style={{ position: 'relative', minHeight: 400 }}>
          <LoadingOverlay visible />
        </div>
      </Container>
    );
  }

  if (error || !disaster) {
    return (
      <Container size="md" py="xl">
        <Alert 
          icon={<IconAlertTriangle size={16} />}
          title="Error"
          color="red"
          variant="light"
        >
          Failed to load disaster details. Please try again.
        </Alert>
        <Button 
          component={Link} 
          to="/disasters" 
          mt="md"
          leftSection={<IconArrowLeft size={16} />}
        >
          Back to Disasters
        </Button>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Button 
        component={Link} 
        to={`/disasters/${id}`} 
        variant="light" 
        mb="xl"
        leftSection={<IconArrowLeft size={16} />}
      >
        Back to Disaster Details
      </Button>
      
      <Card shadow="md" padding="xl" radius="md" withBorder>
        <Group mb="xl">
          <IconEdit size={32} color="blue" />
          <div>
            <Title order={2}>Edit Disaster</Title>
            <Text c="dimmed" size="lg">
              Update disaster information and status
            </Text>
          </div>
        </Group>

        <Alert 
          icon={<IconAlertTriangle size={16} />}
          title="Important"
          color="blue"
          variant="light"
          mb="xl"
        >
          Please ensure all information is accurate. Changes will be visible to all users and emergency responders.
        </Alert>

        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <TextInput
              label="Disaster Title"
              placeholder="e.g., Severe Flooding in Downtown Manhattan"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              error={errors.title}
              required
              leftSection={<IconAlertTriangle size={16} />}
            />

            <Textarea
              label="Description"
              placeholder="Provide detailed information about the disaster, including current conditions and immediate needs..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={errors.description}
              required
              minRows={4}
              maxRows={8}
            />

            <TextInput
              label="Location"
              placeholder="e.g., Manhattan, NYC or 123 Main Street, New York"
              value={formData.location_name}
              onChange={(e) => handleInputChange('location_name', e.target.value)}
              error={errors.location_name}
              required
              leftSection={<IconMapPin size={16} />}
            />

            <Group grow>
              <Select
                label="Severity Level"
                value={formData.severity}
                onChange={(value) => handleInputChange('severity', value)}
                data={[
                  { value: 'low', label: 'Low - Minor impact' },
                  { value: 'medium', label: 'Medium - Moderate impact' },
                  { value: 'high', label: 'High - Major impact' }
                ]}
                required
              />

              <Select
                label="Status"
                value={formData.status}
                onChange={(value) => handleInputChange('status', value)}
                data={[
                  { value: 'active', label: 'Active - Ongoing situation' },
                  { value: 'monitoring', label: 'Monitoring - Under observation' },
                  { value: 'resolved', label: 'Resolved - Situation handled' }
                ]}
                required
              />
            </Group>

            <MultiSelect
              label="Tags"
              placeholder="Select relevant tags to help categorize this disaster"
              value={formData.tags}
              onChange={(value) => handleInputChange('tags', value)}
              data={commonTags}
              searchable
            />

            <Group justify="space-between" mt="xl">
              <Button 
                variant="light" 
                component={Link} 
                to={`/disasters/${id}`}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                loading={updateDisasterMutation.isPending}
                leftSection={<IconCheck size={16} />}
              >
                Update Disaster
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {/* Change Log Info */}
      <Card mt="xl" p="md" withBorder>
        <Title order={4} mb="md">Change Information</Title>
        <Stack gap="xs">
          <Text size="sm">• Changes will be logged for audit purposes</Text>
          <Text size="sm">• All users will be notified of status changes</Text>
          <Text size="sm">• Emergency responders will receive updates automatically</Text>
          <Text size="sm">• Original creation date: {new Date(disaster.created_at).toLocaleString()}</Text>
          <Text size="sm">• Last updated: {new Date(disaster.updated_at).toLocaleString()}</Text>
        </Stack>
      </Card>
    </Container>
  );
}

export default EditDisasterPage;
