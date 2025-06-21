import { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { extractLocation, verifyDisasterImage } from '../services/gemini';
import { geocodeLocation } from '../services/geocoding';
import { AuthenticatedRequest } from '../middleware/auth';
import { emitToDisaster } from '../websocket';

export const getDisasters = async (req: Request, res: Response) => {
  try {
    const { status, severity, tag } = req.query;

    let query = supabase
      .from('disasters')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data: disasters, error } = await query;

    if (error) {
      // Return mock data if database is not available
      console.log('Database not available, returning mock data');
      const mockDisasters = [
        {
          id: '1',
          title: 'NYC Flood Emergency',
          description: 'Heavy flooding in Manhattan due to unprecedented rainfall. Multiple subway lines affected.',
          location_name: 'Manhattan, NYC',
          tags: ['flood', 'emergency', 'transportation'],
          owner_id: 'netrunnerX',
          severity: 'high',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'California Wildfire',
          description: 'Fast-spreading wildfire in Northern California threatening residential areas.',
          location_name: 'Northern California',
          tags: ['wildfire', 'evacuation'],
          owner_id: 'reliefAdmin',
          severity: 'high',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          title: 'Hurricane Preparedness',
          description: 'Category 3 hurricane approaching the Gulf Coast. Evacuation orders in effect.',
          location_name: 'Gulf Coast, FL',
          tags: ['hurricane', 'evacuation', 'preparation'],
          owner_id: 'emergencyCoord',
          severity: 'high',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Apply filters to mock data
      let filteredDisasters = mockDisasters;
      if (status) {
        filteredDisasters = filteredDisasters.filter(d => d.status === status);
      }
      if (severity) {
        filteredDisasters = filteredDisasters.filter(d => d.severity === severity);
      }
      if (tag) {
        filteredDisasters = filteredDisasters.filter(d => d.tags.includes(tag as string));
      }

      return res.json(filteredDisasters);
    }

    res.json(disasters);
  } catch (error) {
    console.error('Error fetching disasters:', error);
    res.status(500).json({ error: 'Failed to fetch disasters' });
  }
};

export const getDisasterById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: disaster, error } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // Return mock data if database is not available
      console.log('Database not available, returning mock disaster data for ID:', id);
      const mockDisasters = [
        {
          id: '1',
          title: 'NYC Flood Emergency',
          description: 'Heavy flooding in Manhattan due to unprecedented rainfall. Multiple subway lines affected. Water levels have risen significantly in downtown areas, causing widespread disruption to transportation and businesses. Emergency services are working around the clock to assist affected residents.',
          location_name: 'Manhattan, NYC',
          location: 'POINT(-74.0060 40.7128)',
          tags: ['flood', 'emergency', 'transportation'],
          owner_id: 'netrunnerX',
          severity: 'high',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'California Wildfire',
          description: 'Fast-spreading wildfire in Northern California threatening residential areas. Evacuation orders have been issued for several neighborhoods. Firefighters are battling strong winds and dry conditions.',
          location_name: 'Northern California',
          location: 'POINT(-122.4194 37.7749)',
          tags: ['wildfire', 'evacuation'],
          owner_id: 'reliefAdmin',
          severity: 'high',
          status: 'active',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          updated_at: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: '3',
          title: 'Hurricane Preparedness',
          description: 'Category 3 hurricane approaching the Gulf Coast. Evacuation orders in effect for coastal areas. Residents are advised to secure their properties and move to higher ground.',
          location_name: 'Gulf Coast, FL',
          location: 'POINT(-82.4572 27.9506)',
          tags: ['hurricane', 'evacuation', 'preparation'],
          owner_id: 'emergencyCoord',
          severity: 'high',
          status: 'active',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          updated_at: new Date(Date.now() - 3600000).toISOString()
        }
      ];

      const mockDisaster = mockDisasters.find(d => d.id === id);
      if (!mockDisaster) {
        return res.status(404).json({ error: 'Disaster not found' });
      }

      return res.json(mockDisaster);
    }

    if (!disaster) return res.status(404).json({ error: 'Disaster not found' });

    res.json(disaster);
  } catch (error) {
    console.error('Error fetching disaster:', error);
    res.status(500).json({ error: 'Failed to fetch disaster' });
  }
};

export const createDisaster = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, location_name, tags } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Extract location using Gemini
    const extractedLocation = await extractLocation(`${title} ${description} ${location_name}`);
    const locationToGeocode = extractedLocation || location_name;

    // Geocode the location
    const coordinates = await geocodeLocation(locationToGeocode);
    if (!coordinates) {
      return res.status(400).json({ error: 'Could not determine location coordinates' });
    }

    const { data: disaster, error: insertError } = await supabase
      .from('disasters')
      .insert({
        title,
        description,
        location_name: locationToGeocode,
        location: `POINT(${coordinates.lng} ${coordinates.lat})`,
        tags: tags || [],
        owner_id: userId,
        status: 'reported',
        severity: 'medium'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Add to audit log
    await supabase
      .from('disaster_audit')
      .insert({
        disaster_id: disaster.id,
        action: 'create',
        user_id: userId,
        new_values: disaster
      });

    // Notify via WebSocket
    emitToDisaster(disaster.id, 'disaster_created', disaster);

    res.status(201).json(disaster);
  } catch (error) {
    console.error('Error creating disaster:', error);
    res.status(500).json({ error: 'Failed to create disaster' });
  }
};

export const updateDisaster = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get current disaster
    const { data: currentDisaster, error: fetchError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentDisaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Check permissions (only owner or admin can update)
    if (currentDisaster.owner_id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this disaster' });
    }

    // Handle location update if needed
    if (updates.location_name && updates.location_name !== currentDisaster.location_name) {
      const coordinates = await geocodeLocation(updates.location_name);
      if (coordinates) {
        updates.location = `POINT(${coordinates.lng} ${coordinates.lat})`;
      }
    }

    // Update disaster
    const { data: updatedDisaster, error: updateError } = await supabase
      .from('disasters')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Add to audit log
    await supabase
      .from('disaster_audit')
      .insert({
        disaster_id: id,
        action: 'update',
        user_id: userId,
        old_values: currentDisaster,
        new_values: updatedDisaster
      });

    // Notify via WebSocket
    emitToDisaster(id, 'disaster_updated', updatedDisaster);

    res.json(updatedDisaster);
  } catch (error) {
    console.error('Error updating disaster:', error);
    res.status(500).json({ error: 'Failed to update disaster' });
  }
};

export const deleteDisaster = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get current disaster
    const { data: currentDisaster, error: fetchError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentDisaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Check permissions (only owner or admin can delete)
    if (currentDisaster.owner_id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this disaster' });
    }

    // Delete disaster
    const { error: deleteError } = await supabase
      .from('disasters')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Add to audit log
    await supabase
      .from('disaster_audit')
      .insert({
        disaster_id: id,
        action: 'delete',
        user_id: userId,
        old_values: currentDisaster
      });

    // Notify via WebSocket
    emitToDisaster(id, 'disaster_deleted', { id });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting disaster:', error);
    res.status(500).json({ error: 'Failed to delete disaster' });
  }
};

export const getDisasterResources = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data: resources, error } = await supabase
      .from('resources')
      .select('*')
      .eq('disaster_id', id);

    if (error) throw error;
    res.json(resources);
  } catch (error) {
    console.error('Error fetching disaster resources:', error);
    res.status(500).json({ error: 'Failed to fetch disaster resources' });
  }
};

export const addResource = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { name, description, location_name, type, quantity, contact_info } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if disaster exists
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('id')
      .eq('id', id)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Geocode the location if provided
    let location = null;
    if (location_name) {
      const coordinates = await geocodeLocation(location_name);
      if (coordinates) {
        location = `POINT(${coordinates.lng} ${coordinates.lat})`;
      }
    }

    const { data: resource, error } = await supabase
      .from('resources')
      .insert({
        disaster_id: id,
        name,
        description,
        location_name,
        location,
        type,
        quantity: quantity || 1,
        contact_info,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    // Notify via WebSocket
    emitToDisaster(id, 'resource_created', resource);

    res.status(201).json(resource);
  } catch (error) {
    console.error('Error adding resource:', error);
    res.status(500).json({ error: 'Failed to add resource' });
  }
};

export const verifyImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if disaster exists
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('id')
      .eq('id', id)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Verify image using Gemini
    const verificationResult = await verifyDisasterImage(imageUrl);

    // Create a report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        disaster_id: id,
        user_id: userId,
        content: 'Image verification report',
        image_url: imageUrl,
        status: verificationResult.isAuthentic ? 'verified' : 'rejected',
        metadata: {
          verification: verificationResult
        }
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // Notify via WebSocket
    emitToDisaster(id, 'report_created', report);

    res.json({
      ...verificationResult,
      reportId: report.id
    });
  } catch (error) {
    console.error('Error verifying image:', error);
    res.status(500).json({ error: 'Failed to verify image' });
  }
};
