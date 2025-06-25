-- Setup script for Supabase PostGIS geospatial functionality
-- This script creates the required PostGIS functions for the disaster response platform

-- Enable PostGIS extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS find_nearby_resources(float8, float8, integer, text);
DROP FUNCTION IF EXISTS find_nearby_disasters(float8, float8, integer);

-- Function to find resources near a point using proper PostGIS
CREATE OR REPLACE FUNCTION find_nearby_resources(
  target_lat float8,
  target_lng float8,
  radius_meters integer DEFAULT 10000,
  resource_type text DEFAULT NULL
) 
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  location_name text,
  disaster_id uuid,
  distance_meters float8,
  latitude float8,
  longitude float8,
  description text,
  quantity integer,
  status text,
  contact_info jsonb,
  created_at timestamptz
) 
LANGUAGE sql 
AS $$
  SELECT 
    r.id,
    r.name,
    r.type,
    r.location_name,
    r.disaster_id,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography
    ) as distance_meters,
    r.latitude,
    r.longitude,
    r.description,
    r.quantity,
    r.status,
    r.contact_info,
    r.created_at
  FROM 
    resources r
  WHERE 
    r.latitude IS NOT NULL 
    AND r.longitude IS NOT NULL
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography,
      radius_meters
    )
    AND (resource_type IS NULL OR r.type = resource_type)
    AND (r.status IS NULL OR r.status = 'available')
  ORDER BY 
    distance_meters ASC
  LIMIT 50;
$$;

-- Function to find disasters near a point
CREATE OR REPLACE FUNCTION find_nearby_disasters(
  target_lat float8,
  target_lng float8,
  radius_meters integer DEFAULT 50000
) 
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  disaster_type text,
  severity text,
  status text,
  location_name text,
  distance_meters float8,
  latitude float8,
  longitude float8,
  tags text[],
  created_at timestamptz
) 
LANGUAGE sql 
AS $$
  SELECT 
    d.id,
    d.title,
    d.description,
    d.disaster_type,
    d.severity,
    d.status,
    d.location_name,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(d.longitude, d.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography
    ) as distance_meters,
    d.latitude,
    d.longitude,
    d.tags,
    d.created_at
  FROM 
    disasters d
  WHERE 
    d.latitude IS NOT NULL 
    AND d.longitude IS NOT NULL
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(d.longitude, d.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)::geography,
      radius_meters
    )
    AND (d.status IS NULL OR d.status = 'active')
  ORDER BY 
    distance_meters ASC
  LIMIT 20;
$$;

-- Create geospatial indexes for fast queries (as specified in assignment)
CREATE INDEX IF NOT EXISTS disasters_location_gist_idx ON disasters USING GIST(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));
CREATE INDEX IF NOT EXISTS resources_location_gist_idx ON resources USING GIST(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));

-- Create additional indexes for efficient filtering (as specified in assignment)
CREATE INDEX IF NOT EXISTS disasters_tags_gin_idx ON disasters USING GIN(tags);
CREATE INDEX IF NOT EXISTS disasters_owner_id_idx ON disasters(owner_id);
CREATE INDEX IF NOT EXISTS disasters_status_idx ON disasters(status);
CREATE INDEX IF NOT EXISTS disasters_disaster_type_idx ON disasters(disaster_type);
CREATE INDEX IF NOT EXISTS resources_type_idx ON resources(type);
CREATE INDEX IF NOT EXISTS resources_status_idx ON resources(status);
CREATE INDEX IF NOT EXISTS resources_disaster_id_idx ON resources(disaster_id);

-- Test the functions with sample data
-- SELECT * FROM find_nearby_resources(40.7128, -74.0060, 10000, 'shelter');
-- SELECT * FROM find_nearby_disasters(40.7128, -74.0060, 50000);
