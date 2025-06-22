import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import { Paper, Text, Badge, Group, Stack, Button, ActionIcon, Tooltip } from '@mantine/core';
import { IconMapPin, IconHome, IconHeart, IconShield, IconMedicalCross, IconShirt, IconDots, IconCurrentLocation } from '@tabler/icons-react';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export interface MapResource {
  id: string;
  name: string;
  type: 'food' | 'water' | 'shelter' | 'medical' | 'clothing' | 'other';
  location_name?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  description?: string;
  quantity?: number;
  contact_info?: any;
  distance?: number;
}

interface InteractiveMapProps {
  resources: MapResource[];
  center?: [number, number];
  zoom?: number;
  radius?: number;
  onLocationChange?: (lat: number, lng: number) => void;
  showUserLocation?: boolean;
  height?: string | number;
}

// Component to fit map bounds to markers
const FitBounds: React.FC<{ resources: MapResource[] }> = ({ resources }) => {
  const map = useMap();

  useEffect(() => {
    if (resources.length > 0) {
      const validResources = resources.filter(r => r.coordinates);
      if (validResources.length > 0) {
        const bounds = new LatLngBounds(
          validResources.map(r => [r.coordinates!.lat, r.coordinates!.lng])
        );
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [resources, map]);

  return null;
};

// Get icon for resource type
const getResourceIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'shelter':
      return <IconHome size={16} />;
    case 'food':
      return <IconHeart size={16} />;
    case 'medical':
      return <IconMedicalCross size={16} />;
    case 'clothing':
      return <IconShirt size={16} />;
    case 'water':
      return <IconShield size={16} />;
    default:
      return <IconDots size={16} />;
  }
};

// Get color for resource type
const getResourceColor = (type: string): string => {
  switch (type) {
    case 'shelter':
      return 'blue';
    case 'food':
      return 'green';
    case 'medical':
      return 'red';
    case 'clothing':
      return 'purple';
    case 'water':
      return 'cyan';
    default:
      return 'gray';
  }
};

// Create custom icon for resource type using simple colored markers
const createResourceIcon = (type: string): Icon => {
  const color = getResourceColor(type);
  const colorMap = {
    'red': '#ff4757',
    'blue': '#3742fa',
    'green': '#2ed573',
    'purple': '#a55eea',
    'cyan': '#26d0ce',
    'gray': '#747d8c'
  };

  const bgColor = colorMap[color as keyof typeof colorMap] || '#747d8c';

  // Use a simple circle marker instead of complex SVG
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="${bgColor}" stroke="white" stroke-width="2"/>
    </svg>
  `;

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svgIcon)}`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  resources,
  center = [40.7128, -74.0060], // Default to NYC
  zoom = 12,
  radius,
  onLocationChange,
  showUserLocation = true,
  height = 400
}) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [mapError, setMapError] = useState<string | null>(null);

  // Get user's current location
  useEffect(() => {
    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos: [number, number] = [
            position.coords.latitude,
            position.coords.longitude
          ];
          setUserLocation(userPos);
          setMapCenter(userPos);
          onLocationChange?.(userPos[0], userPos[1]);
        },
        (error) => {
          console.warn('Could not get user location:', error);
        }
      );
    }
  }, [showUserLocation, onLocationChange]);

  const handleCenterToUser = () => {
    if (userLocation) {
      setMapCenter(userLocation);
    }
  };

  // Error fallback
  if (mapError) {
    return (
      <Paper withBorder style={{ height, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="md">
          <Text c="red" fw={500}>Map Error</Text>
          <Text size="sm" c="dimmed">{mapError}</Text>
          <Button size="sm" onClick={() => setMapError(null)}>Retry</Button>
        </Stack>
      </Paper>
    );
  }

  try {
    return (
      <Paper withBorder style={{ height, position: 'relative' }}>
        {showUserLocation && (
          <Tooltip label="Center on my location">
            <ActionIcon
              variant="filled"
              color="blue"
              size="lg"
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 1000,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
              onClick={handleCenterToUser}
            >
              <IconCurrentLocation size={18} />
            </ActionIcon>
          </Tooltip>
        )}

        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          minZoom={1}
          errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        />
        
        {/* Fit bounds to show all resources */}
        <FitBounds resources={resources} />
        
        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>
              <div>
                <Text fw={500} size="sm">📍 Your Location</Text>
                <Text size="xs" c="dimmed">Current position</Text>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Search radius circle */}
        {radius && userLocation && (
          <Circle
            center={userLocation}
            radius={radius}
            pathOptions={{
              color: '#3742fa',
              fillColor: '#3742fa',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5'
            }}
          />
        )}
        
        {/* Resource markers */}
        {resources.map((resource) => {
          if (!resource.coordinates) return null;

          return (
            <Marker
              key={resource.id}
              position={[resource.coordinates.lat, resource.coordinates.lng]}
              icon={createResourceIcon(resource.type)}
            >
              <Popup maxWidth={300}>
                <Stack gap="xs">
                  <Group justify="space-between" align="flex-start">
                    <Text fw={500} size="sm" style={{ flex: 1 }}>
                      {resource.name}
                    </Text>
                    <Badge
                      size="xs"
                      color={getResourceColor(resource.type)}
                      leftSection={getResourceIcon(resource.type)}
                    >
                      {resource.type}
                    </Badge>
                  </Group>

                  {resource.description && (
                    <Text size="xs" c="dimmed">
                      {resource.description}
                    </Text>
                  )}

                  {resource.location_name && (
                    <Group gap="xs">
                      <IconMapPin size={12} />
                      <Text size="xs" c="dimmed">
                        {resource.location_name}
                      </Text>
                    </Group>
                  )}

                  {resource.quantity && (
                    <Text size="xs">
                      <strong>Quantity:</strong> {resource.quantity}
                    </Text>
                  )}

                  {resource.distance && (
                    <Text size="xs" c="blue">
                      📍 {resource.distance.toFixed(1)} km away
                    </Text>
                  )}

                  {resource.contact_info && (
                    <Text size="xs">
                      <strong>Contact:</strong> {resource.contact_info.phone || resource.contact_info.email || 'Available'}
                    </Text>
                  )}
                </Stack>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </Paper>
  );
  } catch (error) {
    console.error('Map rendering error:', error);
    setMapError(error instanceof Error ? error.message : 'Unknown map error');
    return (
      <Paper withBorder style={{ height, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="md">
          <Text c="red" fw={500}>Map Loading Error</Text>
          <Text size="sm" c="dimmed">Unable to load the interactive map</Text>
          <Button size="sm" onClick={() => window.location.reload()}>Refresh Page</Button>
        </Stack>
      </Paper>
    );
  }
};

export default InteractiveMap;
