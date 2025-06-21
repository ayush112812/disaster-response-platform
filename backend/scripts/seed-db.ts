import { supabase } from '../src/app';
import dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
  console.log('Seeding database...');

  try {
    // Sample disasters
    const { data: disasters, error: disasterError } = await supabase
      .from('disasters')
      .insert([
        {
          title: 'Flood in Downtown',
          description: 'Heavy rainfall caused flooding in the downtown area.',
          location_name: 'Downtown, City',
          location: 'POINT(-73.9857 40.7484)',
          severity: 'high',
          status: 'active',
          tags: ['flood', 'rain', 'emergency']
        },
        {
          title: 'Earthquake in Suburbia',
          description: '5.2 magnitude earthquake reported in the suburbs.',
          location_name: 'Suburbia, County',
          location: 'POINT(-74.0060 40.7128)',
          severity: 'medium',
          status: 'active',
          tags: ['earthquake', 'emergency']
        }
      ])
      .select('*');

    if (disasterError) throw disasterError;
    console.log('Inserted disasters:', disasters);

    // Sample resources for the first disaster
    if (disasters && disasters.length > 0) {
      const disasterId = disasters[0].id;
      
      const { data: resources, error: resourceError } = await supabase
        .from('resources')
        .insert([
          {
            disaster_id: disasterId,
            name: 'Emergency Shelter',
            description: 'Temporary shelter for displaced residents',
            location_name: 'Community Center',
            location: 'POINT(-73.9857 40.7484)',
            type: 'shelter',
            status: 'available'
          },
          {
            disaster_id: disasterId,
            name: 'Medical Supplies',
            description: 'First aid kits and medical supplies',
            location_name: 'Downtown Clinic',
            location: 'POINT(-73.9860 40.7480)',
            type: 'medical',
            quantity: 50,
            status: 'available'
          }
        ]);

      if (resourceError) throw resourceError;
      console.log('Inserted resources');
    }

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
