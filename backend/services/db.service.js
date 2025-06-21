const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const NodeCache = require('node-cache');

// Initialize cache
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

class DatabaseService {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.key);
  }

  // Cache methods
  async getFromCache(key) {
    return cache.get(key);
  }

  async setCache(key, value, ttl = 3600) {
    return cache.set(key, value, ttl);
  }

  async deleteFromCache(key) {
    return cache.del(key);
  }

  // Disasters
  async createDisaster(disasterData) {
    const { data, error } = await this.supabase
      .from('disasters')
      .insert([disasterData])
      .select();
    
    if (error) throw error;
    return data?.[0];
  }

  async getDisasters(filters = {}) {
    let query = this.supabase
      .from('disasters')
      .select('*');

    // Apply filters
    if (filters.tag) {
      query = query.contains('tags', [filters.tag]);
    }
    if (filters.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getDisasterById(id) {
    const { data, error } = await this.supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateDisaster(id, updates) {
    const { data, error } = await this.supabase
      .from('disasters')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data?.[0];
  }

  async deleteDisaster(id) {
    const { error } = await this.supabase
      .from('disasters')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  // Reports
  async createReport(reportData) {
    const { data, error } = await this.supabase
      .from('reports')
      .insert([reportData])
      .select();
    
    if (error) throw error;
    return data?.[0];
  }

  async getDisasterReports(disasterId) {
    const { data, error } = await this.supabase
      .from('reports')
      .select('*')
      .eq('disaster_id', disasterId);
    
    if (error) throw error;
    return data;
  }

  // Resources
  async createResource(resourceData) {
    const { data, error } = await this.supabase
      .from('resources')
      .insert([resourceData])
      .select();
    
    if (error) throw error;
    return data?.[0];
  }

  async getNearbyResources(lat, lng, radius = 10000) {
    // radius in meters (default 10km)
    const { data, error } = await this.supabase.rpc('get_nearby_resources', {
      lat,
      lng,
      radius_meters: radius
    });
    
    if (error) throw error;
    return data;
  }

  // Cache
  async getFromCache(key) {
    const { data, error } = await this.supabase
      .from('cache')
      .select('value')
      .eq('key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) return null;
    return data.value;
  }

  async setCache(key, value, ttl = 3600) {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + ttl);
    
    const { error } = await this.supabase
      .from('cache')
      .upsert({
        key,
        value,
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'key'
      });
    
    if (error) throw error;
    return true;
  }

  // Geospatial queries
  async findResourcesNearDisaster(disasterId, radius = 10000) {
    const { data, error } = await this.supabase.rpc('find_resources_near_disaster', {
      disaster_id: disasterId,
      radius_meters: radius
    });
    
    if (error) throw error;
    return data;
  }
}

const dbService = new DatabaseService();

// Export both the service and the supabase client directly
module.exports = {
  db: dbService,
  supabase: dbService.supabase,
  getFromCache: dbService.getFromCache.bind(dbService),
  setCache: dbService.setCache.bind(dbService),
  deleteFromCache: dbService.deleteFromCache.bind(dbService)
};

// For backward compatibility
module.exports.default = dbService;
