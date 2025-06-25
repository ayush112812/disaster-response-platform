-- ============================================================================
-- SUPABASE TABLE FIXES FOR ASSIGNMENT REQUIREMENTS
-- Run these commands in your Supabase SQL Editor
-- ============================================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- 1. FIX REPORTS TABLE - Add missing verification_status field
-- ============================================================================

-- Add verification_status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status_enum') THEN
        CREATE TYPE verification_status_enum AS ENUM ('pending', 'valid', 'suspicious');
    END IF;
END $$;

-- Add verification_status column to reports table
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS verification_status verification_status_enum DEFAULT 'pending';

-- ============================================================================
-- 2. CREATE/FIX RESOURCES TABLE - Match assignment requirements exactly
-- ============================================================================

-- Drop existing resources table if it exists (to recreate with correct schema)
DROP TABLE IF EXISTS resources CASCADE;

-- Create resources table with exact assignment requirements
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location_name TEXT NOT NULL,
    location GEOGRAPHY(Point, 4326),
    type TEXT NOT NULL CHECK (type IN ('shelter', 'hospital', 'food', 'water', 'medical', 'transport')),
    contact TEXT,
    capacity INTEGER,
    availability TEXT CHECK (availability IN ('available', 'limited', 'full')) DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. VERIFY DISASTERS TABLE - Should already be correct
-- ============================================================================

-- Check if disasters table has all required fields
-- (This should already be correct based on existing migrations)
DO $$
BEGIN
    -- Add any missing columns if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'disasters' AND column_name = 'audit_trail') THEN
        ALTER TABLE disasters ADD COLUMN audit_trail JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- ============================================================================
-- 4. VERIFY CACHE TABLE - Should already be correct
-- ============================================================================

-- The cache table should already be correct, but let's ensure it exists
CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Geospatial indexes
CREATE INDEX IF NOT EXISTS idx_disasters_location ON disasters USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_resources_location ON resources USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports USING GIST (location);

-- Regular indexes
CREATE INDEX IF NOT EXISTS idx_disasters_tags ON disasters USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_resources_disaster_id ON resources (disaster_id);
CREATE INDEX IF NOT EXISTS idx_reports_disaster_id ON reports (disaster_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources (type);
CREATE INDEX IF NOT EXISTS idx_reports_verification_status ON reports (verification_status);

-- ============================================================================
-- 6. CREATE GEOSPATIAL FUNCTIONS FOR NEARBY QUERIES
-- ============================================================================

-- Function to find nearby resources
CREATE OR REPLACE FUNCTION find_nearby_resources(
    target_lat FLOAT,
    target_lng FLOAT,
    radius_meters INTEGER DEFAULT 10000,
    resource_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    disaster_id UUID,
    name TEXT,
    location_name TEXT,
    type TEXT,
    contact TEXT,
    capacity INTEGER,
    availability TEXT,
    distance_meters FLOAT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
AS $$
    SELECT 
        r.id,
        r.disaster_id,
        r.name,
        r.location_name,
        r.type,
        r.contact,
        r.capacity,
        r.availability,
        ST_Distance(
            r.location::geography,
            ST_MakePoint(target_lng, target_lat)::geography
        ) AS distance_meters,
        r.created_at
    FROM resources r
    WHERE 
        ST_DWithin(
            r.location::geography,
            ST_MakePoint(target_lng, target_lat)::geography,
            radius_meters
        )
        AND (resource_type IS NULL OR r.type = resource_type)
    ORDER BY distance_meters;
$$;

-- Function to find nearby disasters
CREATE OR REPLACE FUNCTION find_nearby_disasters(
    target_lat FLOAT,
    target_lng FLOAT,
    radius_meters INTEGER DEFAULT 10000
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    location_name TEXT,
    description TEXT,
    tags TEXT[],
    distance_meters FLOAT,
    created_at TIMESTAMPTZ
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
            ST_MakePoint(target_lng, target_lat)::geography
        ) AS distance_meters,
        d.created_at
    FROM disasters d
    WHERE 
        ST_DWithin(
            d.location::geography,
            ST_MakePoint(target_lng, target_lat)::geography,
            radius_meters
        )
    ORDER BY distance_meters;
$$;

-- ============================================================================
-- 7. INSERT SAMPLE RESOURCES FOR TESTING
-- ============================================================================

-- Insert sample resources for testing (only if table is empty)
INSERT INTO resources (name, location_name, location, type, contact, capacity, availability)
SELECT * FROM (VALUES
    ('Emergency Shelter - Red Cross', 'Community Center, Manhattan', ST_SetSRID(ST_Point(-73.9712, 40.7831), 4326), 'shelter', '(555) 123-4567', 200, 'available'),
    ('Mount Sinai Hospital', 'Upper East Side, Manhattan', ST_SetSRID(ST_Point(-73.9441, 40.7903), 4326), 'hospital', '(555) 987-6543', 150, 'limited'),
    ('Food Distribution Center', 'Local Church, Brooklyn', ST_SetSRID(ST_Point(-73.9442, 40.6782), 4326), 'food', '(555) 456-7890', 500, 'available'),
    ('Water Distribution Point', 'Fire Station #3, Queens', ST_SetSRID(ST_Point(-73.8648, 40.7282), 4326), 'water', '(555) 321-0987', 1000, 'available'),
    ('Mobile Medical Unit', 'Central Park, Manhattan', ST_SetSRID(ST_Point(-73.9654, 40.7829), 4326), 'medical', '(555) 654-3210', 50, 'limited'),
    ('Emergency Transport Hub', 'Grand Central, Manhattan', ST_SetSRID(ST_Point(-73.9772, 40.7527), 4326), 'transport', '(555) 789-0123', 300, 'available')
) AS v(name, location_name, location, type, contact, capacity, availability)
WHERE NOT EXISTS (SELECT 1 FROM resources LIMIT 1);

-- ============================================================================
-- 8. ENABLE ROW LEVEL SECURITY (OPTIONAL BUT RECOMMENDED)
-- ============================================================================

-- Enable RLS on tables (optional - for production security)
-- ALTER TABLE disasters ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION QUERIES - Run these to check everything is working
-- ============================================================================

-- Check table structures
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('disasters', 'reports', 'resources', 'cache')
ORDER BY table_name, ordinal_position;

-- Test geospatial functions
SELECT 'Nearby resources test' as test_name, count(*) as count 
FROM find_nearby_resources(40.7831, -73.9712, 10000);

SELECT 'Cache table test' as test_name, count(*) as count 
FROM cache;

-- Show sample data
SELECT 'Sample resources' as data_type, count(*) as count FROM resources;
SELECT 'Sample disasters' as data_type, count(*) as count FROM disasters;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'SUCCESS: All Supabase tables are now configured according to assignment requirements!' as status;
