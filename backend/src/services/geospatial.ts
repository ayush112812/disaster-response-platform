import { supabase } from './supabase';

interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Simple in-memory cache for development
const cache = new Map<string, { value: any; expiry: number }>();

function getFromCache(key: string): any {
  const item = cache.get(key);
  if (!item || Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function setCache(key: string, value: any, ttlSeconds: number = 300): void {
  const expiry = Date.now() + (ttlSeconds * 1000);
  cache.set(key, { value, expiry });
}

// Calculate distance between two points using Haversine formula
function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
  const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

class GeospatialService {
  public async findNearbyDisasters(point: GeoPoint, radiusKm: number) {
    const cacheKey = `disasters:nearby:${point.latitude},${point.longitude},${radiusKm}`;

    try {
      const cachedResults = getFromCache(cacheKey);
      if (cachedResults) return cachedResults;

      // Get all disasters with location data
      const { data: disasters, error } = await supabase
        .from('disasters')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;
      if (!disasters) return [];

      // Filter disasters within radius and calculate distances
      const nearbyDisasters = disasters
        .map(disaster => ({
          ...disaster,
          distance: calculateDistance(point, {
            latitude: disaster.latitude,
            longitude: disaster.longitude
          })
        }))
        .filter(disaster => disaster.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);

      setCache(cacheKey, nearbyDisasters, 300);
      return nearbyDisasters;
    } catch (error) {
      console.error('Error finding nearby disasters:', error);
      throw error;
    }
  }

  public async findResourcesInBoundingBox(bbox: BoundingBox) {
    const cacheKey = `resources:bbox:${bbox.minLat},${bbox.maxLat},${bbox.minLng},${bbox.maxLng}`;

    try {
      const cachedResults = getFromCache(cacheKey);
      if (cachedResults) return cachedResults;

      // Get resources within bounding box
      const { data: resources, error } = await supabase
        .from('resources')
        .select('*')
        .gte('latitude', bbox.minLat)
        .lte('latitude', bbox.maxLat)
        .gte('longitude', bbox.minLng)
        .lte('longitude', bbox.maxLng);

      if (error) throw error;

      setCache(cacheKey, resources || [], 300);
      return resources || [];
    } catch (error) {
      console.error('Error finding resources in bounding box:', error);
      throw error;
    }
  }

  public async findDisasterClusters(zoom: number) {
    const cacheKey = `disasters:clusters:${zoom}`;

    try {
      const cachedResults = getFromCache(cacheKey);
      if (cachedResults) return cachedResults;

      // Simple clustering based on proximity
      const { data: disasters, error } = await supabase
        .from('disasters')
        .select('*')
        .eq('status', 'active')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;
      if (!disasters) return [];

      // Simple clustering algorithm
      const clusters: any[] = [];
      const processed = new Set<string>();
      const clusterDistance = 0.1 / Math.pow(2, zoom - 10); // Adjust based on zoom

      disasters.forEach(disaster => {
        if (processed.has(disaster.id)) return;

        const cluster = {
          cluster_id: clusters.length,
          point_count: 1,
          centroid: { latitude: disaster.latitude, longitude: disaster.longitude },
          disaster_types: [disaster.type],
          max_severity: disaster.severity,
          disasters: [disaster]
        };

        processed.add(disaster.id);

        // Find nearby disasters to cluster
        disasters.forEach(other => {
          if (processed.has(other.id)) return;

          const distance = calculateDistance(
            { latitude: disaster.latitude, longitude: disaster.longitude },
            { latitude: other.latitude, longitude: other.longitude }
          );

          if (distance <= clusterDistance * 111) { // Convert degrees to km roughly
            cluster.point_count++;
            cluster.disasters.push(other);
            cluster.disaster_types.push(other.type);
            if (other.severity === 'high' || (other.severity === 'medium' && cluster.max_severity === 'low')) {
              cluster.max_severity = other.severity;
            }
            processed.add(other.id);
          }
        });

        clusters.push(cluster);
      });

      setCache(cacheKey, clusters, 300);
      return clusters;
    } catch (error) {
      console.error('Error generating disaster clusters:', error);
      throw error;
    }
  }

  public async calculateImpactZone(disasterId: string) {
    try {
      const { data: disaster, error } = await supabase
        .from('disasters')
        .select('*')
        .eq('id', disasterId)
        .single();

      if (error || !disaster) return null;

      // Simple circular impact zone based on severity
      const radiusKm = disaster.severity === 'high' ? 50 :
                      disaster.severity === 'medium' ? 25 : 10;

      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [this.createCircle(disaster.latitude, disaster.longitude, radiusKm)]
        }
      };
    } catch (error) {
      console.error('Error calculating impact zone:', error);
      throw error;
    }
  }

  private createCircle(lat: number, lng: number, radiusKm: number): number[][] {
    const points = [];
    const earthRadius = 6371; // km

    for (let i = 0; i < 64; i++) {
      const angle = (i * 360 / 64) * Math.PI / 180;
      const dx = radiusKm * Math.cos(angle);
      const dy = radiusKm * Math.sin(angle);

      const deltaLat = dy / earthRadius * 180 / Math.PI;
      const deltaLng = dx / (earthRadius * Math.cos(lat * Math.PI / 180)) * 180 / Math.PI;

      points.push([lng + deltaLng, lat + deltaLat]);
    }

    // Close the polygon
    points.push(points[0]);
    return points;
  }

  public async findOptimalResourceLocations(disasterId: string) {
    try {
      const { data: disaster, error } = await supabase
        .from('disasters')
        .select('*')
        .eq('id', disasterId)
        .single();

      if (error || !disaster) return [];

      // For now, return mock data since we don't have population_centers table
      return [
        {
          id: '1',
          latitude: disaster.latitude + 0.01,
          longitude: disaster.longitude + 0.01,
          population: 50000,
          distance_to_disaster: 1.5
        },
        {
          id: '2',
          latitude: disaster.latitude - 0.01,
          longitude: disaster.longitude - 0.01,
          population: 30000,
          distance_to_disaster: 2.1
        }
      ];
    } catch (error) {
      console.error('Error finding optimal resource locations:', error);
      throw error;
    }
  }
}

export default GeospatialService;

// Export functions for compatibility with routes
export interface Point {
  latitude: number;
  longitude: number;
}

export interface DisasterWithLocation {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  status: string;
  latitude: number;
  longitude: number;
  radius: number;
  created_at: string;
  updated_at: string;
  distance?: number;
}

export interface ResourceWithLocation {
  id: string;
  name: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  contact_info: any;
  availability: string;
  created_at: string;
  updated_at: string;
  distance?: number;
}

// Create a default instance for function exports
const geospatialService = new GeospatialService();

/**
 * Find disasters near a given point
 */
export async function findNearbyDisasters(
  point: Point,
  radiusKm: number = 10
): Promise<DisasterWithLocation[]> {
  try {
    const results = await geospatialService.findNearbyDisasters(
      { latitude: point.latitude, longitude: point.longitude },
      radiusKm
    );
    return results.map((disaster: any) => ({
      ...disaster,
      distance: disaster.distance ? disaster.distance / 1000 : 0 // Convert meters to km
    }));
  } catch (error) {
    console.error('Error finding nearby disasters:', error);
    return [];
  }
}

/**
 * Find resources near a specific disaster
 */
export async function findResourcesNearDisaster(
  disasterId: string,
  radiusKm: number = 10
): Promise<ResourceWithLocation[]> {
  // This is a simplified implementation - in a real app you'd get disaster location first
  // For now, return empty array to prevent errors
  console.warn(`findResourcesNearDisaster not fully implemented with PostGIS service for disaster ${disasterId} within ${radiusKm}km`);
  return [];
}

/**
 * Find resources near a given point
 */
export async function findResourcesNearPoint(
  point: Point,
  radiusKm: number = 10
): Promise<ResourceWithLocation[]> {
  try {
    // Use bounding box approach as fallback
    const bbox = {
      minLat: point.latitude - (radiusKm / 111), // Rough conversion
      maxLat: point.latitude + (radiusKm / 111),
      minLng: point.longitude - (radiusKm / (111 * Math.cos(point.latitude * Math.PI / 180))),
      maxLng: point.longitude + (radiusKm / (111 * Math.cos(point.latitude * Math.PI / 180)))
    };

    const results = await geospatialService.findResourcesInBoundingBox(bbox);
    return results.map((resource: any) => ({
      ...resource,
      distance: 0 // Would need to calculate actual distance
    }));
  } catch (error) {
    console.error('Error finding nearby resources:', error);
    return [];
  }
}

