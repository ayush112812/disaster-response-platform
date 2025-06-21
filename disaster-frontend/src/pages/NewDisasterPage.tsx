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
  Notification
} from '@mantine/core';
import { 
  IconAlertTriangle, 
  IconMapPin, 
  IconArrowLeft,
  IconCheck,
  IconX
} from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDisaster } from '../services/api';

function NewDisasterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location_name: '',
    severity: 'medium' as 'low' | 'medium' | 'high',
    tags: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createDisasterMutation = useMutation({
    mutationFn: createDisaster,
    onSuccess: (data) => {
      // Invalidate and refetch disasters
      queryClient.invalidateQueries({ queryKey: ['disasters'] });
      
      // Show success notification
      alert('Disaster reported successfully!');
      
      // Navigate to the new disaster detail page
      navigate(`/disasters/${data.id}`);
    },
    onError: (error: any) => {
      console.error('Error creating disaster:', error);
      alert('Failed to report disaster. Please try again.');
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
    
    createDisasterMutation.mutate(formData);
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

  return (
    <Container size="md" py="xl">
      <Button 
        component={Link} 
        to="/" 
        variant="light" 
        mb="xl"
        leftSection={<IconArrowLeft size={16} />}
      >
        Back to Dashboard
      </Button>
      
      <Card shadow="md" padding="xl" radius="md" withBorder>
        <Group mb="xl">
          <IconAlertTriangle size={32} color="red" />
          <div>
            <Title order={2}>Report New Disaster</Title>
            <Text c="dimmed" size="lg">
              Provide details about the emergency situation
            </Text>
          </div>
        </Group>

        <Alert 
          icon={<IconAlertTriangle size={16} />}
          title="Important"
          color="orange"
          variant="light"
          mb="xl"
        >
          Please provide accurate and detailed information. This report will be used to coordinate emergency response efforts.
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
              placeholder="Provide detailed information about the disaster, including what happened, current conditions, and immediate needs..."
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

            <Select
              label="Severity Level"
              value={formData.severity}
              onChange={(value) => handleInputChange('severity', value)}
              data={[
                { value: 'low', label: 'Low - Minor impact, limited assistance needed' },
                { value: 'medium', label: 'Medium - Moderate impact, assistance required' },
                { value: 'high', label: 'High - Major impact, urgent assistance needed' }
              ]}
              required
            />

            <MultiSelect
              label="Tags"
              placeholder="Select relevant tags to help categorize this disaster"
              value={formData.tags}
              onChange={(value) => handleInputChange('tags', value)}
              data={commonTags}
              searchable
              creatable
              getCreateLabel={(query) => `+ Create "${query}"`}
              onCreate={(query) => {
                const item = { value: query, label: query };
                return item;
              }}
            />

            <Group justify="space-between" mt="xl">
              <Button 
                variant="light" 
                component={Link} 
                to="/"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                loading={createDisasterMutation.isPending}
                leftSection={<IconCheck size={16} />}
              >
                Report Disaster
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {/* Instructions */}
      <Card mt="xl" p="md" withBorder>
        <Title order={4} mb="md">Reporting Guidelines</Title>
        <Stack gap="xs">
          <Text size="sm">• Provide accurate and specific location information</Text>
          <Text size="sm">• Include current conditions and immediate dangers</Text>
          <Text size="sm">• Mention any casualties or people in need of rescue</Text>
          <Text size="sm">• Specify what type of assistance is most urgently needed</Text>
          <Text size="sm">• Use relevant tags to help emergency responders categorize the situation</Text>
        </Stack>
      </Card>
    </Container>
  );
}

export default NewDisasterPage;
