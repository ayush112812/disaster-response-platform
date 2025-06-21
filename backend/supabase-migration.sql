-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA public;

-- Create disasters table
CREATE TABLE IF NOT EXISTS public.disasters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    location_name TEXT NOT NULL,
    location GEOGRAPHY(Point, 4326),
    description TEXT,
    tags TEXT[],
    owner_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    audit_trail JSONB DEFAULT '[]'::jsonb
);

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID REFERENCES public.disasters(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    verification_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create resources table
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID REFERENCES public.disasters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location_name TEXT NOT NULL,
    location GEOGRAPHY(Point, 4326),
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create cache table
CREATE TABLE IF NOT EXISTS public.cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_disasters_location ON public.disasters USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_disasters_tags ON public.disasters USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_disasters_owner_id ON public.disasters (owner_id);
CREATE INDEX IF NOT EXISTS idx_reports_disaster_id ON public.reports (disaster_id);
CREATE INDEX IF NOT EXISTS idx_resources_disaster_id ON public.resources (disaster_id);
CREATE INDEX IF NOT EXISTS idx_resources_location ON public.resources USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON public.cache (expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for disasters table
DROP TRIGGER IF EXISTS update_disasters_updated_at ON public.disasters;
CREATE TRIGGER update_disasters_updated_at
BEFORE UPDATE ON public.disasters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to add audit trail
CREATE OR REPLACE FUNCTION public.add_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
  NEW.audit_trail = COALESCE(NEW.audit_trail, '[]'::jsonb) || 
    jsonb_build_object(
      'timestamp', timezone('utc'::text, now())::text,
      'user_id', current_setting('request.jwt.claim.sub', true),
      'action', TG_OP
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for audit trail on disasters
DROP TRIGGER IF EXISTS add_disaster_audit_trail ON public.disasters;
CREATE TRIGGER add_disaster_audit_trail
BEFORE INSERT OR UPDATE ON public.disasters
FOR EACH ROW EXECUTE FUNCTION public.add_audit_trail();

-- Enable Row Level Security on all tables
ALTER TABLE public.disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to disasters
CREATE POLICY "Allow public read access to disasters" 
ON public.disasters 
FOR SELECT 
USING (true);

-- Create policy to allow insert for authenticated users
CREATE POLICY "Allow insert for authenticated users" 
ON public.disasters 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create policy to allow update for owners
CREATE POLICY "Allow update for owners" 
ON public.disasters 
FOR UPDATE 
USING (auth.uid()::text = owner_id);

-- Create policy to allow delete for owners
CREATE POLICY "Allow delete for owners" 
ON public.disasters 
FOR DELETE 
USING (auth.uid()::text = owner_id);

-- Create similar policies for reports and resources tables
-- Reports policies
CREATE POLICY "Allow public read access to reports" 
ON public.reports 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert for authenticated users on reports" 
ON public.reports 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Resources policies
CREATE POLICY "Allow public read access to resources" 
ON public.resources 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert for authenticated users on resources" 
ON public.resources 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create a function to get nearby disasters
CREATE OR REPLACE FUNCTION public.get_nearby_disasters(
  lat FLOAT,
  lng FLOAT,
  radius_meters INTEGER DEFAULT 10000
) 
RETURNS TABLE (
  id UUID,
  title TEXT,
  location_name TEXT,
  distance_meters FLOAT
) 
LANGUAGE sql 
AS $$
  SELECT 
    id,
    title,
    location_name,
    ST_Distance(
      location::geography,
      ST_MakePoint(lng, lat)::geography
    ) AS distance_meters
  FROM 
    public.disasters
  WHERE 
    ST_DWithin(
      location::geography,
      ST_MakePoint(lng, lat)::geography,
      radius_meters
    )
  ORDER BY 
    distance_meters;
$$;

-- Create a function to search disasters by text
CREATE OR REPLACE FUNCTION public.search_disasters(
  search_term TEXT
) 
RETURNS TABLE (
  id UUID,
  title TEXT,
  location_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE sql 
AS $$
  SELECT 
    id,
    title,
    location_name,
    description,
    created_at
  FROM 
    public.disasters
  WHERE 
    to_tsvector('english', title || ' ' || location_name || ' ' || COALESCE(description, '')) 
    @@ websearch_to_tsquery('english', search_term)
  ORDER BY 
    created_at DESC;
$$;
