import { supabaseAdmin } from '../src/services/supabase';

async function seedSampleData() {
  try {
    console.log('🌱 Seeding sample data...');
    
    // Create sample disasters
    const { data: disasters, error: disasterError } = await supabaseAdmin
      .from('disasters')
      .insert([
        {
          title: 'NYC Flood Emergency',
          description: 'Heavy flooding in Manhattan due to unprecedented rainfall. Multiple subway lines affected.',
          location_name: 'Manhattan, NYC',
          tags: ['flood', 'emergency', 'transportation'],
          owner_id: 'netrunnerX',
          severity: 'high',
          status: 'active'
        },
        {
          title: 'California Wildfire',
          description: 'Fast-spreading wildfire in Northern California threatening residential areas.',
          location_name: 'Northern California',
          tags: ['wildfire', 'evacuation'],
          owner_id: 'reliefAdmin',
          severity: 'high',
          status: 'active'
        },
        {
          title: 'Hurricane Preparedness',
          description: 'Category 3 hurricane approaching the Gulf Coast. Evacuation orders in effect.',
          location_name: 'Gulf Coast, FL',
          tags: ['hurricane', 'evacuation', 'preparation'],
          owner_id: 'emergencyCoord',
          severity: 'high',
          status: 'active'
        }
      ])
      .select();
    
    if (disasterError) {
      console.error('Error creating sample disasters:', disasterError);
      return;
    }
    
    console.log(`✅ Created ${disasters?.length} sample disasters`);
    
    // Create sample resources for the first disaster
    if (disasters && disasters.length > 0) {
      const { data: resources, error: resourceError } = await supabaseAdmin
        .from('resources')
        .insert([
          {
            disaster_id: disasters[0].id,
            name: 'Emergency Shelter - Community Center',
            description: 'Temporary shelter with capacity for 200 people. Food and medical assistance available.',
            location_name: 'Lower East Side, NYC',
            type: 'shelter',
            quantity: 200,
            contact_info: { phone: '555-0123', email: 'shelter@community.org' },
            created_by: 'reliefAdmin'
          },
          {
            disaster_id: disasters[0].id,
            name: 'Medical Supply Distribution',
            description: 'First aid supplies and medications available for flood victims.',
            location_name: 'Midtown Manhattan, NYC',
            type: 'medical',
            quantity: 500,
            contact_info: { phone: '555-0456', email: 'medical@redcross.org' },
            created_by: 'medicalTeam'
          },
          {
            disaster_id: disasters[0].id,
            name: 'Food Distribution Center',
            description: 'Hot meals and emergency food supplies for displaced families.',
            location_name: 'Brooklyn Heights, NYC',
            type: 'food',
            quantity: 1000,
            contact_info: { phone: '555-0789', email: 'food@salvation.org' },
            created_by: 'foodBank'
          }
        ]);
      
      if (resourceError) {
        console.error('Error creating sample resources:', resourceError);
      } else {
        console.log(`✅ Created ${resources?.length || 0} sample resources`);
      }
    }
    
    // Create sample reports
    if (disasters && disasters.length > 0) {
      const { data: reports, error: reportError } = await supabaseAdmin
        .from('reports')
        .insert([
          {
            disaster_id: disasters[0].id,
            user_id: 'citizen1',
            content: 'Water level rising rapidly on 14th Street. Need immediate evacuation assistance.',
            verification_status: 'pending'
          },
          {
            disaster_id: disasters[0].id,
            user_id: 'volunteer2',
            content: 'Setting up emergency shelter at Community Center. Can accommodate 50 more people.',
            verification_status: 'verified'
          }
        ]);
      
      if (reportError) {
        console.error('Error creating sample reports:', reportError);
      } else {
        console.log(`✅ Created ${reports?.length || 0} sample reports`);
      }
    }
    
    console.log('✅ Sample data seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
  }
}

// Run the seeding
if (require.main === module) {
  seedSampleData();
}
