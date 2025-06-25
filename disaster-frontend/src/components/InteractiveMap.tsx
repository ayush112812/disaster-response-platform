import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import { Text, Badge, Group, Stack, Button, ActionIcon, Tooltip } from '@mantine/core';
import { IconMapPin, IconHome, IconHeart, IconShield, IconMedicalCross, IconShirt, IconDots, IconCurrentLocation } from '@tabler/icons-react';
import 'leaflet/dist/leaflet.css';

// Fix for default markers using SVG to avoid file loading issues
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
      <path fill="#3388ff" stroke="#fff" stroke-width="2" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z"/>
      <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
    </svg>
  `)}`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
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

// Component to handle map sizing issues
const MapSizeHandler: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        map.invalidateSize(true);
        console.log('Map size invalidated by MapSizeHandler');
      }, 50);
    };

    // Immediate size invalidation
    map.invalidateSize(true);
    console.log('Immediate map size invalidation');

    // Multiple invalidations during initial load to ensure proper sizing
    const immediateIntervals = [50, 100, 200, 300, 500, 1000, 1500, 2000, 3000].map(delay =>
      setTimeout(() => {
        map.invalidateSize(true);
        console.log(`Map size invalidated after ${delay}ms`);
      }, delay)
    );

    // Listen for window resize
    window.addEventListener('resize', handleResize);

    // Force a complete re-render by triggering tile refresh
    setTimeout(() => {
      map.eachLayer((layer: any) => {
        if (layer._url) { // This is a tile layer
          layer.redraw();
          console.log('Tile layer redrawn');
        }
      });
    }, 1000);

    return () => {
      window.removeEventListener('resize', handleResize);
      immediateIntervals.forEach(clearTimeout);
    };
  }, [map]);

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

// Create custom icon for resource type
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
  height = 500
}) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tileServerIndex, setTileServerIndex] = useState(0);
  const [autoSwitchCompleted, setAutoSwitchCompleted] = useState(false);

  // Multiple tile servers as fallbacks
  const tileServers = [
    {
      url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    {
      url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  ];

  console.log('InteractiveMap render:', {
    resources: resources.length,
    center,
    mapCenter,
    mapLoaded,
    mapError,
    tileServerIndex,
    autoSwitchCompleted,
    currentTileServer: tileServers[tileServerIndex]?.url
  });

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

  // Force map to invalidate size after loading
  useEffect(() => {
    if (mapLoaded) {
      const timer = setTimeout(() => {
        // Trigger a window resize event to force map to recalculate size
        window.dispatchEvent(new Event('resize'));

        // Also try to find the map instance and invalidate size directly
        const mapContainers = document.querySelectorAll('.leaflet-container');
        mapContainers.forEach((container: any) => {
          if (container._leaflet_map) {
            console.log('Invalidating map size directly');
            container._leaflet_map.invalidateSize(true);
          }
        });
      }, 100);

      // Also try after a longer delay
      const timer2 = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        const mapContainers = document.querySelectorAll('.leaflet-container');
        mapContainers.forEach((container: any) => {
          if (container._leaflet_map) {
            console.log('Second invalidation attempt');
            container._leaflet_map.invalidateSize(true);
          }
        });
      }, 500);

      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }
  }, [mapLoaded]);

  // Automatic tile server cycling to fix initial loading issues
  useEffect(() => {
    if (!autoSwitchCompleted) {
      console.log('🔄 Starting automatic tile server cycling to fix initial loading...');

      const switchSequence = [
        { server: 0, delay: 1000 },  // Start with server 1
        { server: 1, delay: 2000 },  // Switch to server 2 after 1s
        { server: 2, delay: 3000 },  // Switch to server 3 after 2s
        { server: 0, delay: 4000 },  // Back to server 1 after 3s
      ];

      const timeouts = switchSequence.map(({ server, delay }) =>
        setTimeout(() => {
          console.log(`🔄 Auto-switching to tile server ${server + 1}`);
          setTileServerIndex(server);

          // Force size invalidation after each switch
          setTimeout(() => {
            const mapContainers = document.querySelectorAll('.leaflet-container');
            mapContainers.forEach((container: any) => {
              if (container._leaflet_map) {
                container._leaflet_map.invalidateSize(true);
                console.log(`📐 Map size invalidated after auto-switch to server ${server + 1}`);
              }
            });
          }, 200);
        }, delay)
      );

      // Mark auto-switch as completed after the sequence
      const completionTimeout = setTimeout(() => {
        setAutoSwitchCompleted(true);
        console.log('✅ Automatic tile server cycling completed');
      }, 5000);

      return () => {
        timeouts.forEach(clearTimeout);
        clearTimeout(completionTimeout);
      };
    }
  }, [autoSwitchCompleted]);

  // Add timeout for map loading and force refresh if needed
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!mapLoaded && !mapError) {
        console.warn('Map loading timeout - forcing load and refresh');
        setMapLoaded(true);

        // Force a complete map refresh
        setTimeout(() => {
          const mapContainers = document.querySelectorAll('.leaflet-container');
          mapContainers.forEach((container: any) => {
            if (container._leaflet_map) {
              container._leaflet_map.invalidateSize(true);
              // Force redraw all layers
              container._leaflet_map.eachLayer((layer: any) => {
                if (layer._url) {
                  layer.redraw();
                }
              });
              console.log('Forced complete map refresh due to timeout');
            }
          });
        }, 100);
      }
    }, 8000); // Increased to 8 seconds to allow auto-switching to complete

    return () => clearTimeout(timeout);
  }, [mapLoaded, mapError]);

  // Error fallback
  if (mapError) {
    return (
      <div
        className="map-container"
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          width: '100%',
          position: 'relative',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Stack align="center" gap="md">
          <Text c="red" fw={500}>Map Loading Failed</Text>
          <Text size="sm" c="dimmed" ta="center">
            {mapError}
            <br />
            Please refresh the page to try again
          </Text>
          <Button size="sm" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </Stack>
      </div>
    );
  }

  return (
    <div
      className="interactive-map-container"
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: '100%',
        position: 'relative',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'block',
        minHeight: '400px'
      }}
    >
      {!mapLoaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(248, 249, 250, 0.9)',
          zIndex: 1001
        }}>
          <Stack align="center" gap="md">
            <Text fw={500}>Loading Map...</Text>
            <Text size="sm" c="dimmed">Please wait while the map loads</Text>
          </Stack>
        </div>
      )}

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

      {/* Debug: Manual tile server switcher */}
      {process.env.NODE_ENV === 'development' && (
        <Tooltip label={`Switch tile server (current: ${tileServerIndex + 1}/${tileServers.length})`}>
          <ActionIcon
            variant="filled"
            color="orange"
            size="sm"
            style={{
              position: 'absolute',
              top: 10,
              right: showUserLocation ? 60 : 10,
              zIndex: 1000,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
            onClick={() => {
              setTileServerIndex(prev => (prev + 1) % tileServers.length);
              setAutoSwitchCompleted(true); // Stop auto-switching when manually controlled
            }}
          >
            {tileServerIndex + 1}
          </ActionIcon>
        </Tooltip>
      )}

      <MapContainer
        key={`map-${mapCenter[0]}-${mapCenter[1]}-${mapLoaded}-${tileServerIndex}`}
        center={mapCenter}
        zoom={zoom}
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          width: '100%',
          minHeight: '400px',
          maxHeight: typeof height === 'number' ? `${height}px` : height,
          zIndex: 1,
          display: 'block',
          position: 'relative',
          backgroundColor: '#f8f9fa'
        }}
        scrollWheelZoom={true}
        zoomControl={true}
        attributionControl={true}
        whenReady={() => {
          console.log('Map created successfully');
          setMapLoaded(true);
          setMapError(null);

          // Force size invalidation when map is ready
          setTimeout(() => {
            const mapContainers = document.querySelectorAll('.leaflet-container');
            mapContainers.forEach((container: any) => {
              if (container._leaflet_map) {
                container._leaflet_map.invalidateSize(true);
                console.log('Map size invalidated on ready');
              }
            });
          }, 100);
        }}
      >
        <TileLayer
          key={`tile-server-${tileServerIndex}`}
          attribution={tileServers[tileServerIndex].attribution}
          url={tileServers[tileServerIndex].url}
          maxZoom={19}
          minZoom={3}
          eventHandlers={{
            loading: () => {
              console.log(`Tiles loading from server ${tileServerIndex + 1}...`);
            },
            load: () => {
              console.log(`Tiles loaded successfully from server ${tileServerIndex + 1}`);

              // Force map size invalidation after tiles load to ensure proper display
              setTimeout(() => {
                const mapContainers = document.querySelectorAll('.leaflet-container');
                mapContainers.forEach((container: any) => {
                  if (container._leaflet_map) {
                    container._leaflet_map.invalidateSize(true);
                    console.log('Map size invalidated after tile load');
                  }
                });

                // Also trigger a window resize event
                window.dispatchEvent(new Event('resize'));
              }, 200);
            },
            tileerror: (e) => {
              console.error(`Tile loading error from server ${tileServerIndex + 1}:`, e);
              console.warn('If tiles fail to load, try disabling ad blockers or check network connectivity');

              // Try next tile server if available
              if (tileServerIndex < tileServers.length - 1) {
                console.log(`Switching to backup tile server ${tileServerIndex + 2}...`);
                setTileServerIndex(prev => prev + 1);
              } else {
                console.error('All tile servers failed. Please check your internet connection or disable ad blockers.');
                setMapError('Failed to load map tiles. Please check your internet connection or disable ad blockers.');
              }
            }
          }}
        />
        
        <FitBounds resources={resources} />
        <MapSizeHandler />

        {/* Debug info overlay */}
        {(!mapLoaded || !autoSwitchCompleted) && (
          <div style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000
          }}>
            {!autoSwitchCompleted ? (
              <>🔄 Auto-cycling servers: {tileServerIndex + 1}/{tileServers.length}</>
            ) : (
              <>Loading tiles from server {tileServerIndex + 1}/{tileServers.length}...</>
            )}
          </div>
        )}

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
    </div>
  );
};

export default InteractiveMap;
