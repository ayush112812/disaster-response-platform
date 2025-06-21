-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create disasters table
CREATE TABLE IF NOT EXISTS disasters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_name TEXT NOT NULL,
    location GEOGRAPHY(Point, 4326),
    disaster_type VARCHAR(50),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
    status VARCHAR(20) CHECK (status IN ('active', 'resolved', 'mitigated')) DEFAULT 'active',
    tags TEXT[],
    owner_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    audit_trail JSONB DEFAULT '[]'::jsonb
);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location_name TEXT,
    location GEOGRAPHY(Point, 4326),
    type VARCHAR(50) NOT NULL,
    quantity INTEGER DEFAULT 1,
    contact_info JSONB,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    verification_status VARCHAR(20) CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create cache table
CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS disasters_location_idx ON disasters USING GIST (location);
CREATE INDEX IF NOT EXISTS disasters_tags_idx ON disasters USING GIN (tags);
CREATE INDEX IF NOT EXISTS disasters_owner_id_idx ON disasters(owner_id);
CREATE INDEX IF NOT EXISTS resources_location_idx ON resources USING GIST (location);
CREATE INDEX IF NOT EXISTS resources_disaster_id_idx ON resources(disaster_id);
CREATE INDEX IF NOT EXISTS reports_disaster_id_idx ON reports(disaster_id);
CREATE INDEX IF NOT EXISTS cache_expires_at_idx ON cache(expires_at);

-- Create function for finding resources near a disaster
CREATE OR REPLACE FUNCTION find_resources_near_disaster(disaster_id UUID, radius_meters FLOAT DEFAULT 10000)
RETURNS SETOF resources AS $$
BEGIN
    RETURN QUERY
    SELECT r.*
    FROM resources r
    JOIN disasters d ON d.id = disaster_id
    WHERE ST_DWithin(r.location, d.location, radius_meters);
END;
$$ LANGUAGE plpgsql;

-- Create function for finding nearby disasters
CREATE OR REPLACE FUNCTION find_nearby_disasters(lat FLOAT, lng FLOAT, radius_meters FLOAT DEFAULT 10000)
RETURNS SETOF disasters AS $$
BEGIN
    RETURN QUERY
    SELECT d.*
    FROM disasters d
    WHERE ST_DWithin(
        d.location,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
        radius_meters
    );
END;
$$ LANGUAGE plpgsql;