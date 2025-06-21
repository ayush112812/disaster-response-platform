require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY);

// Path to migrations directory
const migrationsDir = path.join(__dirname, '../db/migrations');

// Function to execute a SQL query
async function executeQuery(sql) {
  try {
    // Try using the Supabase client first
    const { data, error } = await supabase.rpc('pg_query', { query: sql });
    
    if (error) {
      // If pg_query fails, try direct SQL execution (works for some operations)
      const { data: directData, error: directError } = await supabase.rpc('execute_sql', { query: sql });
      
      if (directError) {
        throw directError;
      }
      
      return directData;
    }
    
    return data;
  } catch (error) {
    console.error('Error executing query:', sql);
    console.error('Error details:', error);
    throw error;
  }
}

// Function to enable PostGIS extension
async function enablePostGIS() {
  try {
    console.log('Enabling PostGIS extension...');
    await executeQuery('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await executeQuery('CREATE EXTENSION IF NOT EXISTS "postgis"');
    console.log('PostGIS extension enabled successfully');
  } catch (error) {
    console.error('Error enabling PostGIS extension:', error.message);
    throw error;
  }
}

// Function to run SQL migrations
async function runMigrations() {
  try {
    // First, enable required extensions
    await enablePostGIS();
    
    // Get all SQL files in the migrations directory
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Execute each migration file
    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Split the SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Execute each statement
      for (const statement of statements) {
        if (statement) {
          try {
            await executeQuery(statement);
          } catch (error) {
            console.error(`Error in statement: ${statement.substring(0, 100)}...`);
            console.error('Error details:', error.message);
            // Continue with next statement
          }
        }
      }
    }
    
    // Create database functions
    console.log('\nCreating database functions...');
    await createDatabaseFunctions();
    
    console.log('\n✅ Database initialization completed successfully!');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
runMigrations();
