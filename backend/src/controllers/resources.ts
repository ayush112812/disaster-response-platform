import { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { geocodeLocation } from '../services/geocoding';
import { AuthenticatedRequest } from '../middleware/auth';
import { emitToDisaster } from '../websocket';

export const getResources = async (req: Request, res: Response) => {
  try {
    const { disasterId, type, lat, lng, radius = 10000 } = req.query;
    
    let query = supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (disasterId) {
      query = query.eq('disaster_id', disasterId);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (lat && lng) {
      const point = `POINT(${lng} ${lat})`;
      query = query.filter('location', 'within_radius', `${point},${radius}`);
    }

    const { data: resources, error } = await query;

    if (error) throw error;
    res.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
};

export const getResourceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data: resource, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    res.json(resource);
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
};

export const createResource = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { disasterId } = req.params;
    const { name, description, location_name, type, quantity, contact_info } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if disaster exists
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('id')
      .eq('id', disasterId)
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
        disaster_id: disasterId,
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
    emitToDisaster(disasterId, 'resource_created', resource);

    res.status(201).json(resource);
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
};

export const updateResource = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get current resource
    const { data: currentResource, error: fetchError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentResource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Check permissions (only creator or admin can update)
    if (currentResource.created_by !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this resource' });
    }

    // Handle location update if needed
    if (updates.location_name && updates.location_name !== currentResource.location_name) {
      const coordinates = await geocodeLocation(updates.location_name);
      if (coordinates) {
        updates.location = `POINT(${coordinates.lng} ${coordinates.lat})`;
      }
    }

    // Update resource
    const { data: updatedResource, error: updateError } = await supabase
      .from('resources')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Notify via WebSocket
    emitToDisaster(currentResource.disaster_id, 'resource_updated', updatedResource);

    res.json(updatedResource);
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
};

export const deleteResource = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get current resource
    const { data: currentResource, error: fetchError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentResource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Check permissions (only creator or admin can delete)
    if (currentResource.created_by !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this resource' });
    }

    // Delete resource
    const { error: deleteError } = await supabase
      .from('resources')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Notify via WebSocket
    emitToDisaster(currentResource.disaster_id, 'resource_deleted', { id });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
};
