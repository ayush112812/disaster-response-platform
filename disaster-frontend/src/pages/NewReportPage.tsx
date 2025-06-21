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
  Stack,
  Alert,
  FileInput
} from '@mantine/core';
import { 
  IconUsers, 
  IconArrowLeft,
  IconCheck,
  IconPhoto,
  IconAlertTriangle
} from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDisasters } from '../services/api';

function NewReportPage() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    disaster_id: '',
    content: '',
    image_file: null as File | null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get disasters for the dropdown
  const { data: disasters } = useQuery({
    queryKey: ['disasters'],
    queryFn: getDisasters,
    retry: 1,
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.disaster_id) {
      newErrors.disaster_id = 'Please select a disaster';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Report content is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Report submitted successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const disasterOptions = disasters?.map(disaster => ({
    value: disaster.id,
    label: `${disaster.title} - ${disaster.location_name}`
  })) || [];

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
          <IconUsers size={32} color="blue" />
          <div>
            <Title order={2}>Submit Disaster Report</Title>
            <Text c="dimmed" size="lg">
              Share information about current conditions or needs
            </Text>
          </div>
        </Group>

        <Alert 
          icon={<IconAlertTriangle size={16} />}
          title="Report Guidelines"
          color="blue"
          variant="light"
          mb="xl"
        >
          Please provide accurate, first-hand information. Your report will help emergency responders understand the current situation and coordinate assistance.
        </Alert>

        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <Select
              label="Related Disaster"
              placeholder="Select the disaster this report is about"
              value={formData.disaster_id}
              onChange={(value) => handleInputChange('disaster_id', value)}
              data={disasterOptions}
              error={errors.disaster_id}
              required
              searchable
              nothingFoundMessage="No disasters found"
            />

            <Textarea
              label="Report Details"
              placeholder="Describe what you're seeing, current conditions, immediate needs, or any other relevant information..."
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              error={errors.content}
              required
              minRows={6}
              maxRows={12}
            />

            <FileInput
              label="Attach Photo (Optional)"
              placeholder="Upload a photo to support your report"
              value={formData.image_file}
              onChange={(file) => handleInputChange('image_file', file)}
              leftSection={<IconPhoto size={16} />}
              accept="image/*"
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
                loading={isSubmitting}
                leftSection={<IconCheck size={16} />}
              >
                Submit Report
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {/* Guidelines */}
      <Card mt="xl" p="md" withBorder>
        <Title order={4} mb="md">What to Include in Your Report</Title>
        <Stack gap="xs">
          <Text size="sm">• Current conditions at your location</Text>
          <Text size="sm">• Immediate needs (food, water, medical assistance, etc.)</Text>
          <Text size="sm">• Number of people affected</Text>
          <Text size="sm">• Safety hazards or blocked routes</Text>
          <Text size="sm">• Available resources or assistance being provided</Text>
          <Text size="sm">• Contact information if you can provide ongoing updates</Text>
        </Stack>
      </Card>

      {/* Emergency Contact */}
      <Alert 
        icon={<IconAlertTriangle size={16} />}
        title="Emergency Situations"
        color="red"
        variant="light"
        mt="xl"
      >
        <Text mb="xs">
          If this is a life-threatening emergency, call 911 immediately.
        </Text>
        <Text size="sm" c="dimmed">
          This reporting system is for coordination and information sharing, not immediate emergency response.
        </Text>
      </Alert>
    </Container>
  );
}

export default NewReportPage;
