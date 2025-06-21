require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test connection with a simple query to list tables
    const { data: tables, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    if (error) {
      console.error('Error connecting to Supabase:', error);
      return;
    }

    console.log('✅ Successfully connected to Supabase!');
    
    if (tables && tables.length > 0) {
      console.log('\nAvailable tables in the public schema:');
      tables.forEach(table => console.log(`- ${table.tablename}`));
    } else {
      console.log('\nNo tables found in the public schema.');
      console.log('Please run the SQL migration in Supabase SQL Editor.');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();
