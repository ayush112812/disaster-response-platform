require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample data
const sampleDisasters = [
  {
    id: uuidv4(),
    title: 'Flood in Downtown',
    location_name: 'Manhattan, New York, USA',
    description: 'Severe flooding in downtown area due to heavy rainfall. Multiple roads are closed.',
    tags: ['flood', 'rain', 'emergency'],
    owner_id: 'system',
    location: {
      type: 'Point',
      coordinates: [-74.006, 40.7128], // Longitude, Latitude for Manhattan
      crs: { type: 'name', properties: { name: 'EPSG:4326' } }
    }
  },
  {
    id: uuidv4(),
    title: 'Wildfire in Northern California',
    location_name: 'Redding, California, USA',
    description: 'Wildfire spreading rapidly due to dry conditions. Evacuation orders in place.',
    tags: ['wildfire', 'evacuation', 'emergency'],
    owner_id: 'system',
    location: {
      type: 'Point',
      coordinates: [-122.3917, 40.5865], // Longitude, Latitude for Redding, CA
      crs: { type: 'name', properties: { name: 'EPSG:4326' } }
    }
  },
  {
    id: uuidv4(),
    title: 'Earthquake in Tokyo',
    location_name: 'Tokyo, Japan',
    description: 'Magnitude 6.5 earthquake reported. Aftershocks expected.',
    tags: ['earthquake', 'emergency'],
    owner_id: 'system',
    location: {
      type: 'Point',
      coordinates: [139.6917, 35.6762], // Longitude, Latitude for Tokyo
      crs: { type: 'name', properties: { name: 'EPSG:4326' } }
    }
  }
];

const sampleResources = [
  {
    name: 'Central Emergency Shelter',
    type: 'shelter',
    location_name: '123 Main St, Manhattan, NY',
    capacity: 200,
    contact: 'shelter@example.com',
    notes: 'Open 24/7. Food and water provided.'
  },
  {
    name: 'Mobile Medical Unit',
    type: 'medical',
    location_name: '456 Park Ave, Manhattan, NY',
    capacity: 50,
    contact: 'medical@example.com',
    notes: 'Emergency medical services available.'
  },
  {
    name: 'Food Distribution Center',
    type: 'food',
    location_name: '789 Broadway, Manhattan, NY',
    capacity: 500,
    contact: 'food@example.com',
    notes: 'Non-perishable food items and water.'
  }
];

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Seed disasters
    console.log('Seeding disasters...');
    for (const disaster of sampleDisasters) {
      const { data, error } = await supabase
        .from('disasters')
        .upsert({
          ...disaster,
          audit_trail: [{
            action: 'create',
            user_id: 'system',
            timestamp: new Date().toISOString(),
            details: 'Seeded by database initialization script'
          }]
        }, {
          onConflict: 'id'
        });
      
      if (error) throw error;
      
      console.log(`  Seeded disaster: ${disaster.title}`);
      
      // Seed resources for this disaster
      console.log('  Seeding resources...');
      for (const resource of sampleResources) {
        const resourceWithDisasterId = {
          ...resource,
          disaster_id: disaster.id,
          location: {
            type: 'Point',
            coordinates: [
              disaster.location.coordinates[0] + (Math.random() * 0.02 - 0.01), // Add some randomness
              disaster.location.coordinates[1] + (Math.random() * 0.02 - 0.01)
            ],
            crs: { type: 'name', properties: { name: 'EPSG:4326' } }
          }
        };
        
        const { error: resourceError } = await supabase
          .from('resources')
          .upsert(resourceWithDisasterId, {
            onConflict: 'id'
          });
        
        if (resourceError) throw resourceError;
        console.log(`    Seeded resource: ${resource.name}`);
      }
    }
    
    console.log('✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedDatabase();
