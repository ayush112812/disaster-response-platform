-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create enum types
CREATE TYPE disaster_severity AS ENUM ('low', 'medium', 'high');
CREATE TYPE disaster_status AS ENUM ('active', 'resolved', 'archived');
CREATE TYPE resource_status AS ENUM ('available', 'deployed', 'unavailable');

-- Create disasters table with geospatial support
CREATE TABLE IF NOT EXISTS disasters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    disaster_type VARCHAR(50) NOT NULL,
    severity disaster_severity NOT NULL DEFAULT 'medium',
    status disaster_status NOT NULL DEFAULT 'active',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_geom GEOGRAPHY(POINT) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    impact_radius_km INTEGER,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create resources table with geospatial support
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    status resource_status NOT NULL DEFAULT 'available',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_geom GEOGRAPHY(POINT) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    contact_info JSONB,
    disaster_id UUID REFERENCES disasters(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create disaster updates table
CREATE TABLE IF NOT EXISTS disaster_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disaster_id UUID NOT NULL REFERENCES disasters(id),
    update_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(100),
    verified BOOLEAN DEFAULT false,
    media_urls TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create population centers table for resource allocation optimization
CREATE TABLE IF NOT EXISTS population_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_geom GEOGRAPHY(POINT) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    population INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit trail table
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_disasters_location ON disasters USING GIST(location_geom);
CREATE INDEX idx_disasters_status ON disasters(status);
CREATE INDEX idx_disasters_type ON disasters(disaster_type);
CREATE INDEX idx_resources_location ON resources USING GIST(location_geom);
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_disaster ON resources(disaster_id);
CREATE INDEX idx_population_centers_location ON population_centers USING GIST(location_geom);

-- Create audit trail trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_trail (table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_trail (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_trail (table_name, record_id, action, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER disasters_audit
AFTER INSERT OR UPDATE OR DELETE ON disasters
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER resources_audit
AFTER INSERT OR UPDATE OR DELETE ON resources
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update timestamp triggers
CREATE TRIGGER update_disasters_timestamp
BEFORE UPDATE ON disasters
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_resources_timestamp
BEFORE UPDATE ON resources
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_population_centers_timestamp
BEFORE UPDATE ON population_centers
FOR EACH ROW EXECUTE FUNCTION update_timestamp();