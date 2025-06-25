-- Database schema exactly as specified in assignment
-- "Use Supabase (PostgreSQL) with tables: disasters, reports, resources, cache"

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS disasters CASCADE;
DROP TABLE IF EXISTS cache CASCADE;

-- Create disasters table as specified in assignment
-- "disasters: (id, title, location_name [TEXT], location [GEOGRAPHY], description, tags [TEXT[]], owner_id, created_at, audit_trail [JSONB])"
CREATE TABLE disasters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    location_name TEXT NOT NULL,
    location GEOGRAPHY(Point, 4326),
    description TEXT,
    tags TEXT[],
    owner_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    audit_trail JSONB DEFAULT '[]'::jsonb,
    
    -- Additional fields for disaster management
    disaster_type VARCHAR(50),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
    status VARCHAR(20) CHECK (status IN ('active', 'resolved', 'mitigated')) DEFAULT 'active',
    
    -- Coordinates for geospatial queries
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8)
);

-- Create reports table as specified in assignment
-- "reports: (id, disaster_id, user_id, content, image_url, verification_status, created_at)"
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID NOT NULL REFERENCES disasters(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    verification_status VARCHAR(20) CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional fields for report management
    report_type VARCHAR(50),
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    location_name TEXT,
    coordinates GEOGRAPHY(Point, 4326)
);

-- Create resources table as specified in assignment
-- "resources: (id, disaster_id, name, location_name [TEXT], location [GEOGRAPHY], type, created_at)"
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID REFERENCES disasters(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    location_name TEXT,
    location GEOGRAPHY(Point, 4326),
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Additional fields for resource management
    description TEXT,
    quantity INTEGER DEFAULT 1,
    status VARCHAR(20) CHECK (status IN ('available', 'allocated', 'depleted')) DEFAULT 'available',
    contact_info JSONB,
    
    -- Coordinates for geospatial queries
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8)
);

-- Create cache table as specified in assignment
-- "cache: (key, value [JSONB], expires_at)"
CREATE TABLE cache (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create geospatial indexes as specified in assignment
-- "Create geospatial indexes on location columns (e.g., CREATE INDEX disasters_location_idx ON disasters USING GIST (location))"
CREATE INDEX disasters_location_idx ON disasters USING GIST (location);
CREATE INDEX resources_location_idx ON resources USING GIST (location);
CREATE INDEX reports_location_idx ON reports USING GIST (coordinates);

-- Create additional indexes as specified in assignment
-- "Create indexes on tags (GIN index) and owner_id for efficient filtering"
CREATE INDEX disasters_tags_gin_idx ON disasters USING GIN (tags);
CREATE INDEX disasters_owner_id_idx ON disasters (owner_id);
CREATE INDEX disasters_status_idx ON disasters (status);
CREATE INDEX disasters_disaster_type_idx ON disasters (disaster_type);
CREATE INDEX disasters_created_at_idx ON disasters (created_at);

-- Resource indexes
CREATE INDEX resources_type_idx ON resources (type);
CREATE INDEX resources_status_idx ON resources (status);
CREATE INDEX resources_disaster_id_idx ON resources (disaster_id);
CREATE INDEX resources_created_at_idx ON resources (created_at);

-- Report indexes
CREATE INDEX reports_disaster_id_idx ON reports (disaster_id);
CREATE INDEX reports_user_id_idx ON reports (user_id);
CREATE INDEX reports_verification_status_idx ON reports (verification_status);
CREATE INDEX reports_created_at_idx ON reports (created_at);

-- Cache indexes
CREATE INDEX cache_expires_at_idx ON cache (expires_at);
CREATE INDEX cache_created_at_idx ON cache (created_at);

-- Create triggers to update location GEOGRAPHY from lat/lng coordinates
CREATE OR REPLACE FUNCTION update_disaster_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_resource_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER disaster_location_trigger
    BEFORE INSERT OR UPDATE ON disasters
    FOR EACH ROW
    EXECUTE FUNCTION update_disaster_location();

CREATE TRIGGER resource_location_trigger
    BEFORE INSERT OR UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_location();

-- Insert sample data as specified in assignment
-- "Sample Data: Disaster: { title: "NYC Flood", location_name: "Manhattan, NYC", description: "Heavy flooding in Manhattan", tags: ["flood", "urgent"], owner_id: "netrunnerX" }"
INSERT INTO disasters (title, location_name, description, tags, owner_id, disaster_type, severity, latitude, longitude) VALUES
('NYC Flood', 'Manhattan, NYC', 'Heavy flooding in Manhattan', ARRAY['flood', 'urgent'], 'netrunnerX', 'flood', 'high', 40.7831, -73.9712),
('California Wildfire', 'Los Angeles, CA', 'Large wildfire spreading rapidly', ARRAY['fire', 'urgent'], 'reliefAdmin', 'fire', 'high', 34.0522, -118.2437),
('Miami Hurricane', 'Miami, FL', 'Category 3 hurricane approaching', ARRAY['hurricane', 'urgent'], 'netrunnerX', 'hurricane', 'high', 25.7617, -80.1918),
('Seattle Earthquake', 'Seattle, WA', 'Magnitude 6.2 earthquake', ARRAY['earthquake'], 'reliefAdmin', 'earthquake', 'medium', 47.6062, -122.3321);

-- "Resource: { disaster_id: "123", name: "Red Cross Shelter", location_name: "Lower East Side, NYC", type: "shelter" }"
INSERT INTO resources (disaster_id, name, location_name, type, description, quantity, latitude, longitude, contact_info) VALUES
((SELECT id FROM disasters WHERE title = 'NYC Flood'), 'Red Cross Shelter', 'Lower East Side, NYC', 'shelter', 'Emergency shelter with 200 beds', 200, 40.7209, -73.9896, '{"phone": "555-0123", "contact": "Red Cross NYC"}'),
((SELECT id FROM disasters WHERE title = 'NYC Flood'), 'Food Distribution Center', 'Brooklyn, NYC', 'food', 'Emergency food supplies', 1000, 40.6782, -73.9442, '{"phone": "555-0124", "contact": "NYC Emergency"}'),
((SELECT id FROM disasters WHERE title = 'California Wildfire'), 'Evacuation Center', 'Pasadena, CA', 'shelter', 'Temporary evacuation shelter', 500, 34.1478, -118.1445, '{"phone": "555-0125", "contact": "LA County Emergency"}'),
((SELECT id FROM disasters WHERE title = 'Miami Hurricane'), 'Medical Station', 'Miami Beach, FL', 'medical', 'Emergency medical services', 50, 25.7907, -80.1300, '{"phone": "555-0126", "contact": "Miami-Dade Emergency"}');

-- "Report: { disaster_id: "123", user_id: "citizen1", content: "Need food in Lower East Side", image_url: "http://example.com/flood.jpg", verification_status: "pending" }"
INSERT INTO reports (disaster_id, user_id, content, image_url, verification_status, report_type, priority, location_name) VALUES
((SELECT id FROM disasters WHERE title = 'NYC Flood'), 'citizen1', 'Need food in Lower East Side', 'http://example.com/flood.jpg', 'pending', 'need', 'high', 'Lower East Side, NYC'),
((SELECT id FROM disasters WHERE title = 'NYC Flood'), 'citizen2', 'Water rescue needed on 42nd Street', 'http://example.com/rescue.jpg', 'verified', 'emergency', 'urgent', 'Midtown Manhattan, NYC'),
((SELECT id FROM disasters WHERE title = 'California Wildfire'), 'citizen3', 'Offering temporary housing for evacuees', 'http://example.com/housing.jpg', 'verified', 'offer', 'medium', 'Pasadena, CA'),
((SELECT id FROM disasters WHERE title = 'Miami Hurricane'), 'citizen4', 'Medical supplies running low at hospital', 'http://example.com/medical.jpg', 'pending', 'need', 'high', 'Miami Beach, FL');

-- Create PostGIS functions for geospatial queries (as specified in assignment)
-- Include the functions from setup_geospatial.sql
