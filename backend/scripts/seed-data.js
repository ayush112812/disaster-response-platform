require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

// Sample disasters data
const disasters = [
  {
    title: 'Flood in Mumbai',
    location_name: 'Mumbai, Maharashtra',
    location: 'POINT(72.8777 19.0760)',
    description: 'Heavy rainfall causing severe flooding in low-lying areas',
    tags: ['flood', 'rain', 'emergency'],
    owner_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    title: 'Earthquake in Delhi',
    location_name: 'New Delhi',
    location: 'POINT(77.2090 28.6139)',
    description: 'Moderate earthquake reported in the capital region',
    tags: ['earthquake', 'emergency'],
    owner_id: '00000000-0000-0000-0000-000000000002'
  },
  {
    title: 'Cyclone Alert - Odisha Coast',
    location_name: 'Puri, Odisha',
    location: 'POINT(85.8333 19.8135)',
    description: 'Cyclone warning issued for coastal areas',
    tags: ['cyclone', 'storm', 'emergency'],
    owner_id: '00000000-0000-0000-0000-000000000003'
  }
];

// Sample resources
const resources = [
  {
    name: 'Emergency Shelter - Andheri',
    location_name: 'Andheri East, Mumbai',
    location: 'POINT(72.8696 19.1175)',
    type: 'shelter',
    disaster_id: null
  },
  {
    name: 'Medical Camp - Bandra',
    location_name: 'Bandra West, Mumbai',
    location: 'POINT(72.8276 19.0559)',
    type: 'medical',
    disaster_id: null
  },
  {
    name: 'Food Distribution Center - South Delhi',
    location_name: 'Hauz Khas, New Delhi',
    location: 'POINT(77.2004 28.5533)',
    type: 'food',
    disaster_id: null
  }
];

// Sample reports
const reports = [
  {
    disaster_id: null, // Will be set after disaster is created
    user_id: 'user_123',
    content: 'Water level rising rapidly in Andheri East',
    image_url: 'https://example.com/flood1.jpg',
    verification_status: 'verified'
  },
  {
    disaster_id: null, // Will be set after disaster is created
    user_id: 'user_456',
    content: 'Building collapse reported in Bandra',
    verification_status: 'pending'
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Insert disasters
    console.log('🌪️  Seeding disasters...');
    const { data: insertedDisasters, error: disasterError } = await supabase
      .from('disasters')
      .insert(disasters)
      .select('*');
    
    if (disasterError) throw disasterError;
    console.log(`✅ Seeded ${insertedDisasters.length} disasters`);
    
    // Update disaster IDs in resources and reports
    if (insertedDisasters.length > 0) {
      resources[0].disaster_id = insertedDisasters[0].id;
      resources[1].disaster_id = insertedDisasters[0].id;
      resources[2].disaster_id = insertedDisasters[1].id;
      
      reports[0].disaster_id = insertedDisasters[0].id;
      reports[1].disaster_id = insertedDisasters[0].id;
    }
    
    // Insert resources
    console.log('🛠️  Seeding resources...');
    const { data: insertedResources, error: resourceError } = await supabase
      .from('resources')
      .insert(resources)
      .select('*');
    
    if (resourceError) throw resourceError;
    console.log(`✅ Seeded ${insertedResources.length} resources`);
    
    // Insert reports
    console.log('📝 Seeding reports...');
    const { data: insertedReports, error: reportError } = await supabase
      .from('reports')
      .insert(reports)
      .select('*');
    
    if (reportError) throw reportError;
    console.log(`✅ Seeded ${insertedReports.length} reports`);
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\nSample Data Overview:');
    console.log(`- Disasters: ${insertedDisasters.length}`);
    console.log(`- Resources: ${insertedResources.length}`);
    console.log(`- Reports: ${insertedReports.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
