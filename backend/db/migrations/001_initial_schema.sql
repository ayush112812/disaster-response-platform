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

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
