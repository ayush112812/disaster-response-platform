-- Function to find resources near a point
CREATE OR REPLACE FUNCTION find_nearby_resources(
  lat float8,
  lng float8,
  radius_meters integer DEFAULT 10000
) 
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  location_name text,
  disaster_id uuid,
  distance_meters float8
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
      r.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_meters
  FROM 
    resources r
  WHERE 
    ST_DWithin(
      r.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY 
    distance_meters ASC;
$$;

-- Function to find disasters near a point
CREATE OR REPLACE FUNCTION find_nearby_disasters(
  lat float8,
  lng float8,
  radius_meters integer DEFAULT 10000
) 
RETURNS TABLE (
  id uuid,
  title text,
  location_name text,
  description text,
  tags text[],
  distance_meters float8
) 
LANGUAGE sql 
AS $$
  SELECT 
    d.id,
    d.title,
    d.location_name,
    d.description,
    d.tags,
    ST_Distance(
      d.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_meters
  FROM 
    disasters d
  WHERE 
    d.location IS NOT NULL
    AND ST_DWithin(
      d.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY 
    distance_meters ASC;
$$;

-- Function to find resources near a disaster
CREATE OR REPLACE FUNCTION find_resources_near_disaster(
  disaster_id_param uuid,
  radius_meters integer DEFAULT 10000
) 
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  location_name text,
  distance_meters float8
) 
LANGUAGE sql 
AS $$
  WITH disaster_location AS (
    SELECT location 
    FROM disasters 
    WHERE id = disaster_id_param
  )
  SELECT 
    r.id,
    r.name,
    r.type,
    r.location_name,
    ST_Distance(
      r.location::geography,
      (SELECT location FROM disaster_location)::geography
    ) as distance_meters
  FROM 
    resources r
  WHERE 
    r.disaster_id = disaster_id_param
    AND (SELECT location FROM disaster_location) IS NOT NULL
    AND ST_DWithin(
      r.location::geography,
      (SELECT location FROM disaster_location)::geography,
      radius_meters
    )
  ORDER BY 
    distance_meters ASC;
$$;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void 
LANGUAGE sql 
AS $$
  DELETE FROM cache 
  WHERE expires_at < NOW();
$$;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on disasters table
CREATE TRIGGER update_disasters_updated_at
BEFORE UPDATE ON disasters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on resources table
CREATE TRIGGER update_resources_updated_at
BEFORE UPDATE ON resources
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a scheduled job to clean up expired cache entries
-- This would be set up in the Supabase dashboard or via pg_cron if available
-- Example:
-- SELECT cron.schedule('0 * * * *', 'SELECT clean_expired_cache()');
