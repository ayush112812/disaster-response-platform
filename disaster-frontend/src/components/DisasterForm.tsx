import { useState, useEffect } from 'react';
import { TextInput, Textarea, MultiSelect, Button, Stack, Paper, Title,
  Group, ActionIcon, Tooltip, Badge, Alert, LoadingOverlay, Divider, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconMapPin, IconBrain, IconRefresh, IconCheck, IconX, IconPhoto } from '@tabler/icons-react';
import { createDisaster, updateDisaster, extractLocation, geocodeLocation, Coordinates } from '../services/api';
import { ImageVerification } from './ImageVerification';

interface DisasterFormProps {
  disaster?: {
    id: string;
    title: string;
    description: string;
    location_name: string;
    tags: string[];
  };
  onSuccess?: () => void;
}

const AVAILABLE_TAGS = [
  'flood',
  'earthquake',
  'fire',
  'hurricane',
  'tornado',
  'urgent',
  'medical',
  'shelter',
  'food',
  'water'
];

export function DisasterForm({ disaster, onSuccess }: DisasterFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: disaster?.title || '',
    description: disaster?.description || '',
    location_name: disaster?.location_name || '',
    tags: disaster?.tags || []
  });

  // Location extraction and geocoding state
  const [extractedLocation, setExtractedLocation] = useState<string>('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'none' | 'extracted' | 'geocoded' | 'error'>('none');

  // Image verification state
  const [showImageVerification, setShowImageVerification] = useState(false);
  const [verificationResults, setVerificationResults] = useState<any[]>([]);

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => {
      return disaster
        ? updateDisaster(disaster.id, data)
        : createDisaster({
            ...data,
            severity: 'medium' as const,
            status: 'reported' as const,
            owner_id: 'anonymous'
          });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disasters'] });
      notifications.show({
        title: `Disaster ${disaster ? 'Updated' : 'Created'}`,
        message: `Successfully ${disaster ? 'updated' : 'created'} the disaster record.`,
        color: 'green'
      });
      onSuccess?.();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'An error occurred',
        color: 'red'
      });
    }
  });

  // Auto-extract location when description changes
  useEffect(() => {
    if (formData.description.length > 20 && !disaster) {
      const timeoutId = setTimeout(() => {
        handleExtractLocation();
      }, 2000); // Wait 2 seconds after user stops typing

      return () => clearTimeout(timeoutId);
    }
  }, [formData.description]);

  const handleExtractLocation = async () => {
    if (!formData.description.trim()) return;

    setIsExtracting(true);
    setLocationStatus('none');

    try {
      const result = await extractLocation(formData.description);
      if (result.extractedLocation) {
        setExtractedLocation(result.extractedLocation);
        setLocationStatus('extracted');

        // Auto-geocode the extracted location
        if (result.coordinates) {
          setCoordinates(result.coordinates);
          setLocationStatus('geocoded');
        } else {
          handleGeocodeLocation(result.extractedLocation);
        }

        notifications.show({
          title: 'Location Extracted',
          message: `Found location: ${result.extractedLocation}`,
          color: 'blue'
        });
      }
    } catch (error) {
      setLocationStatus('error');
      console.error('Location extraction failed:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGeocodeLocation = async (locationName?: string) => {
    const location = locationName || formData.location_name;
    if (!location.trim()) return;

    setIsGeocoding(true);

    try {
      const result = await geocodeLocation(location);
      setCoordinates(result.coordinates);
      setLocationStatus('geocoded');

      notifications.show({
        title: 'Location Geocoded',
        message: `Coordinates found: ${result.coordinates.lat.toFixed(4)}, ${result.coordinates.lng.toFixed(4)}`,
        color: 'green'
      });
    } catch (error) {
      setLocationStatus('error');
      notifications.show({
        title: 'Geocoding Failed',
        message: 'Could not find coordinates for this location',
        color: 'orange'
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const useExtractedLocation = () => {
    setFormData({ ...formData, location_name: extractedLocation });
    setExtractedLocation('');
  };

  const handleImageVerificationComplete = (result: any) => {
    setVerificationResults(prev => [...prev, result]);
    notifications.show({
      title: 'Image Verification Added',
      message: `Image ${result.isAuthentic ? 'verified' : 'flagged'} and added to disaster report`,
      color: result.isAuthentic ? 'green' : 'orange'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Paper p="md" radius="md" style={{ position: 'relative' }}>
      <LoadingOverlay visible={isExtracting && !disaster} />

      <Title order={2} mb="md">{disaster ? 'Edit Disaster' : 'Report New Disaster'}</Title>

      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            required
            label="Title"
            placeholder="Enter disaster title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div>
            <Group justify="space-between" mb="xs">
              <label style={{ fontSize: '14px', fontWeight: 500 }}>Description</label>
              {!disaster && (
                <Group gap="xs">
                  <Badge
                    color={isExtracting ? 'blue' : locationStatus === 'extracted' ? 'green' : 'gray'}
                    variant="light"
                    size="sm"
                  >
                    {isExtracting ? 'Extracting...' : locationStatus === 'extracted' ? 'Location Found' : 'AI Location'}
                  </Badge>
                  <Tooltip label="Extract location from description using AI">
                    <ActionIcon
                      variant="light"
                      size="sm"
                      onClick={handleExtractLocation}
                      loading={isExtracting}
                    >
                      <IconBrain size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )}
            </Group>
            <Textarea
              required
              placeholder="Describe the disaster situation in detail. AI will automatically extract location information."
              minRows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            {!disaster && formData.description.length > 20 && (
              <Alert color="blue" variant="light" mt="xs">
                💡 AI will automatically extract location from your description
              </Alert>
            )}
          </div>

          {extractedLocation && (
            <Alert
              icon={<IconMapPin size={16} />}
              title="Location Extracted by AI"
              color="green"
              variant="light"
            >
              <Group justify="space-between" align="flex-start">
                <div>
                  Found location: <strong>{extractedLocation}</strong>
                  <br />
                  <small>Click ✓ to use this location or ✗ to dismiss</small>
                </div>
                <Group gap="xs">
                  <ActionIcon color="green" onClick={useExtractedLocation}>
                    <IconCheck size={16} />
                  </ActionIcon>
                  <ActionIcon color="red" onClick={() => setExtractedLocation('')}>
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Alert>
          )}

          <div>
            <Group justify="space-between" mb="xs">
              <label style={{ fontSize: '14px', fontWeight: 500 }}>Location *</label>
              <Group gap="xs">
                {coordinates && (
                  <Badge color="green" variant="light" size="sm">
                    Geocoded ✓
                  </Badge>
                )}
                <Tooltip label="Get coordinates for this location">
                  <ActionIcon
                    variant="light"
                    size="sm"
                    onClick={() => handleGeocodeLocation()}
                    loading={isGeocoding}
                    disabled={!formData.location_name.trim()}
                  >
                    <IconMapPin size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
            <TextInput
              required
              placeholder="Enter location name (e.g., Manhattan, NYC)"
              value={formData.location_name}
              onChange={(e) => {
                setFormData({ ...formData, location_name: e.target.value });
                setCoordinates(null);
                setLocationStatus('none');
              }}
              rightSection={
                isGeocoding ? (
                  <ActionIcon loading size="sm" />
                ) : coordinates ? (
                  <IconCheck size={16} color="green" />
                ) : null
              }
            />
            {coordinates && (
              <Alert color="green" variant="light" mt="xs">
                📍 Coordinates: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </Alert>
            )}
          </div>

          <MultiSelect
            label="Tags"
            placeholder="Select relevant tags"
            data={AVAILABLE_TAGS}
            value={formData.tags}
            onChange={(value) => setFormData({ ...formData, tags: value })}
            searchable
            clearable
          />

          {!disaster && (
            <>
              <Divider my="md" />

              <Group justify="space-between" mb="md">
                <Group>
                  <IconPhoto size={20} />
                  <Title order={4}>Image Evidence (Optional)</Title>
                </Group>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => setShowImageVerification(!showImageVerification)}
                  leftSection={<IconPhoto size={16} />}
                >
                  {showImageVerification ? 'Hide' : 'Add'} Image Verification
                </Button>
              </Group>

              {showImageVerification && (
                <ImageVerification
                  disasterId="temp-disaster-id" // Will be replaced with actual ID after creation
                  onVerificationComplete={handleImageVerificationComplete}
                  title="Verify Disaster Images"
                />
              )}

              {verificationResults.length > 0 && (
                <Alert color="green" variant="light">
                  <Text size="sm" fw={500} mb="xs">
                    ✅ {verificationResults.length} image(s) verified
                  </Text>
                  {verificationResults.map((result, index) => (
                    <Text key={index} size="xs" c="dimmed">
                      • Image {index + 1}: {result.isAuthentic ? 'Authentic' : 'Flagged'}
                      ({Math.round(result.confidence * 100)}% confidence)
                    </Text>
                  ))}
                </Alert>
              )}
            </>
          )}

          <Button
            type="submit"
            loading={mutation.isPending}
            size="md"
            leftSection={<IconCheck size={16} />}
          >
            {disaster ? 'Update Disaster' : 'Report Disaster'}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}