import { supabaseAdmin } from '../src/services/supabase';
import dotenv from 'dotenv';

dotenv.config();

async function initDatabase() {
  console.log('Initializing database...');

  try {
    // Enable PostGIS extension for geospatial queries
    const { data: extensionData, error: extensionError } = await supabaseAdmin
      .rpc('create_extension', { extname: 'postgis' });

    if (extensionError && !extensionError.message.includes('already exists')) {
      throw extensionError;
    }

    console.log('PostGIS extension enabled');

    // Create tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS disasters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        location_name TEXT NOT NULL,
        location GEOGRAPHY(Point, 4326),
        disaster_type TEXT,
        severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
        status TEXT CHECK (status IN ('active', 'resolved', 'mitigated')) DEFAULT 'active',
        tags TEXT[],
        owner_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        audit_trail JSONB DEFAULT '[]'::jsonb
      )`,
      
      `CREATE TABLE IF NOT EXISTS resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        location_name TEXT,
        location GEOGRAPHY(Point, 4326),
        type TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        contact_info JSONB,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      
      `CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
        user_id UUID,
        content TEXT NOT NULL,
        image_url TEXT,
        location_name TEXT,
        location GEOGRAPHY(Point, 4326),
        status TEXT CHECK (status IN ('pending', 'verified', 'rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB
      )`,
      
      `CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      )`
    ];

    for (const table of tables) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { query: table });
      if (error) throw error;
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_disasters_location ON disasters USING GIST (location)',
      'CREATE INDEX IF NOT EXISTS idx_disasters_tags ON disasters USING GIN (tags)',
      'CREATE INDEX IF NOT EXISTS idx_resources_location ON resources USING GIST (location)',
      'CREATE INDEX IF NOT EXISTS idx_reports_location ON reports USING GIST (location)',
      'CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache (expires_at)'
    ];

    for (const index of indexes) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { query: index });
      if (error) throw error;
    }

    console.log('Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
