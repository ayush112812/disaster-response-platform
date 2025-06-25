import React, { useState } from 'react';
import { Card, Text, Button, Textarea, Alert, Group, Stack, Badge, Code, Collapse, Checkbox, Switch } from '@mantine/core';
import { IconMapPin, IconLoader2, IconCheck, IconAlertCircle, IconWorldLatitude, IconBuildingStore, IconAlertTriangle } from '@tabler/icons-react';

interface GeocodeResult {
  success: boolean;
  description: string;
  location_name: string | null;
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  nearby_resources?: any[];
  nearby_count?: number;
  disaster_created?: boolean;
  disaster_id?: string;
  message?: string;
  error?: string;
}

const Geocoding: React.FC = () => {
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<GeocodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDisaster, setCreateDisaster] = useState(false);
  const [userId] = useState('demo_user'); // Demo user for testing

  const handleGeocode = async () => {
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ingestion/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description.trim(),
          createDisaster,
          userId: createDisaster ? userId : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to geocode description');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleGeocode();
    }
  };

  const exampleDescriptions = [
    "There is severe flooding in Lower East Side, NYC.",
    "Major earthquake in San Francisco, buildings are shaking",
    "Wildfire spreading near Napa Valley, evacuation recommended",
    "Flash flooding in downtown Austin, Texas",
    "Hurricane approaching Miami Beach, Florida",
    "Tornado spotted in Moore, Oklahoma"
  ];

  const handleExampleClick = (example: string) => {
    setDescription(example);
    setResult(null);
    setError(null);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <Stack gap="xl">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            🌍 Location Geocoding
          </h1>
          <Text c="dimmed">
            Extract location names from disaster descriptions using Google Gemini AI and convert them to coordinates
          </Text>
        </div>

        {/* Input Form */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconMapPin size={20} />
              <Text fw={500}>Disaster Description Input</Text>
            </Group>

            <div>
              <Text size="sm" fw={500} mb="xs">
                Enter a disaster description:
              </Text>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleGeocode();
                  }
                }}
                placeholder="e.g., There is severe flooding in Lower East Side, NYC."
                minRows={4}
                disabled={loading}
              />
              <Text size="xs" c="dimmed" mt="xs">
                Tip: Press Ctrl+Enter to geocode
              </Text>
            </div>

            <Card withBorder padding="sm" bg="blue.0">
              <Stack gap="xs">
                <Text size="sm" fw={500}>🚀 Enhanced Features</Text>
                <Switch
                  checked={createDisaster}
                  onChange={(event) => setCreateDisaster(event.currentTarget.checked)}
                  label="Create disaster record automatically"
                  description="This will create a disaster entry in the database with the extracted location"
                />
                <Text size="xs" c="dimmed">
                  ✅ Find nearby resources automatically<br/>
                  ✅ Cache results for 1 hour<br/>
                  ✅ Real-time WebSocket updates
                </Text>
              </Stack>
            </Card>

            <Button
              onClick={handleGeocode}
              disabled={loading || !description.trim()}
              fullWidth
              leftSection={loading ? <IconLoader2 size={16} /> : <IconMapPin size={16} />}
              loading={loading}
            >
              {loading ? 'Extracting Location...' : 'Extract Location & Get Coordinates'}
            </Button>
          </Stack>
        </Card>

        {/* Example Descriptions */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={500}>📝 Example Descriptions</Text>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.5rem' }}>
              {exampleDescriptions.map((example, index) => (
                <Button
                  key={index}
                  variant="light"
                  size="sm"
                  onClick={() => handleExampleClick(example)}
                  style={{
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    height: 'auto',
                    padding: '0.75rem',
                    whiteSpace: 'normal'
                  }}
                  disabled={loading}
                >
                  "{example}"
                </Button>
              ))}
            </div>
          </Stack>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        {/* Results Display */}
        {result && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group gap="xs">
                {result.location_name ? (
                  <IconCheck size={20} color="green" />
                ) : (
                  <IconAlertCircle size={20} color="orange" />
                )}
                <Text fw={500}>Geocoding Results</Text>
              </Group>

              <Card withBorder padding="md" bg="gray.0">
                <Text fw={500} mb="xs">Input Description:</Text>
                <Text fs="italic">"{result.description}"</Text>
              </Card>

              {result.location_name ? (
                <>
                  <Card withBorder padding="md" bg="green.0">
                    <Text fw={500} c="green.8" mb="xs">✅ Location Detected:</Text>
                    <Text size="lg" fw={500} c="green.8">{result.location_name}</Text>
                  </Card>

                  {result.coordinates ? (
                    <Card withBorder padding="md" bg="blue.0">
                      <Text fw={500} c="blue.8" mb="xs">📍 Coordinates:</Text>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <Text fw={500} c="blue.7">Latitude:</Text>
                          <Code>{result.coordinates.lat}</Code>
                        </div>
                        <div>
                          <Text fw={500} c="blue.7">Longitude:</Text>
                          <Code>{result.coordinates.lng}</Code>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card withBorder padding="md" bg="yellow.0">
                      <Text fw={500} c="yellow.8" mb="xs">⚠️ Coordinates:</Text>
                      <Text c="yellow.8">Could not convert location to coordinates</Text>
                    </Card>
                  )}

                  {/* Disaster Creation Result */}
                  {result.disaster_created && (
                    <Card withBorder padding="md" bg="green.0">
                      <Text fw={500} c="green.8" mb="xs">🎯 Disaster Created Successfully!</Text>
                      <Group gap="xs">
                        <IconAlertTriangle size={16} color="green" />
                        <Text c="green.8">Disaster ID: {result.disaster_id}</Text>
                      </Group>
                      <Text size="sm" c="green.7" mt="xs">
                        A disaster record has been created in the database with the extracted location data.
                      </Text>
                    </Card>
                  )}

                  {/* Nearby Resources */}
                  {result.nearby_resources && result.nearby_resources.length > 0 && (
                    <Card withBorder padding="md" bg="blue.0">
                      <Text fw={500} c="blue.8" mb="xs">🏪 Nearby Resources ({result.nearby_count})</Text>
                      <Stack gap="xs">
                        {result.nearby_resources.slice(0, 5).map((resource, index) => (
                          <Card key={index} withBorder padding="xs" bg="white">
                            <Group gap="xs">
                              <IconBuildingStore size={16} color="blue" />
                              <div>
                                <Text size="sm" fw={500}>{resource.name || `Resource ${index + 1}`}</Text>
                                <Text size="xs" c="dimmed">{resource.type || 'Unknown type'}</Text>
                              </div>
                            </Group>
                          </Card>
                        ))}
                        {result.nearby_count > 5 && (
                          <Text size="xs" c="dimmed">
                            ... and {result.nearby_count - 5} more resources
                          </Text>
                        )}
                      </Stack>
                    </Card>
                  )}
                </>
              ) : (
                <Card withBorder padding="md" bg="yellow.0">
                  <Text fw={500} c="yellow.8" mb="xs">⚠️ No Location Detected</Text>
                  <Text c="yellow.8">
                    {result.message || "No specific location was found in the description"}
                  </Text>
                </Card>
              )}

              {/* Raw JSON Response */}
              <Collapse in={true}>
                <Card withBorder padding="md" bg="gray.0">
                  <Text fw={500} mb="xs">🔍 Raw API Response (JSON)</Text>
                  <Code block>
                    {JSON.stringify(result, null, 2)}
                  </Code>
                </Card>
              </Collapse>
            </Stack>
          </Card>
        )}


      </Stack>
    </div>
  );
};

export default Geocoding;
