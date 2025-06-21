require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

async function checkData() {
  try {
    console.log('🔍 Checking database data...\n');
    
    // Check disasters
    const { data: disasters, error: disasterError } = await supabase
      .from('disasters')
      .select('*');
    
    if (disasterError) throw disasterError;
    console.log(`🌪️  Found ${disasters.length} disasters:`);
    disasters.forEach(d => {
      console.log(`  - ${d.title} (${d.location_name})`);
    });
    
    // Check resources
    const { data: resources, error: resourceError } = await supabase
      .from('resources')
      .select('*');
    
    if (resourceError) throw resourceError;
    console.log(`\n🛠️  Found ${resources.length} resources:`);
    resources.forEach(r => {
      console.log(`  - ${r.name} (${r.type})`);
    });
    
    // Check reports
    const { data: reports, error: reportError } = await supabase
      .from('reports')
      .select('*');
    
    if (reportError) throw reportError;
    console.log(`\n📝 Found ${reports.length} reports:`);
    reports.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.content.substring(0, 50)}...`);
    });
    
    console.log('\n✅ Database check completed successfully!');
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
}

// Run the check
checkData();
