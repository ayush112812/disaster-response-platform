import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { Resource } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { createResource, updateResource, deleteResource } from '../services/api';

interface ResourceManagementProps {
  disasterId?: string;
  onResourceChange?: (resource: Resource) => void;
}

const resourceTypes = [
  'Medical Supplies',
  'Food and Water',
  'Shelter',
  'Transportation',
  'Communication Equipment',
  'Power Supply',
  'Search and Rescue Equipment',
  'Other'
];

const ResourceManagement: React.FC<ResourceManagementProps> = ({
  disasterId,
  onResourceChange
}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const { socket } = useWebSocket();

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    quantity: 1,
    status: 'available',
    latitude: 0,
    longitude: 0,
    contact_info: {
      name: '',
      phone: '',
      email: ''
    }
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('resource_update', (data: any) => {
      if (data.disasterId === disasterId) {
        setResources(prev =>
          prev.map(r => (r.id === data.resourceId ? { ...r, ...data } : r))
        );
      }
    });

    return () => {
      socket.off('resource_update');
    };
  }, [socket, disasterId]);

  const handleOpenDialog = (resource?: Resource) => {
    if (resource) {
      setSelectedResource(resource);
      setFormData({
        name: resource.name,
        type: resource.type,
        description: resource.description || '',
        quantity: resource.quantity,
        status: resource.status,
        latitude: resource.latitude,
        longitude: resource.longitude,
        contact_info: resource.contact_info || {
          name: '',
          phone: '',
          email: ''
        }
      });
    } else {
      setSelectedResource(null);
      setFormData({
        name: '',
        type: '',
        description: '',
        quantity: 1,
        status: 'available',
        latitude: 0,
        longitude: 0,
        contact_info: {
          name: '',
          phone: '',
          email: ''
        }
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const resourceData = {
        ...formData,
        disaster_id: disasterId
      };

      let result;
      if (selectedResource) {
        result = await updateResource(selectedResource.id, resourceData);
      } else {
        result = await createResource(resourceData);
      }

      if (onResourceChange) {
        onResourceChange(result);
      }

      setResources(prev =>
        selectedResource
          ? prev.map(r => (r.id === result.id ? result : r))
          : [...prev, result]
      );

      setOpenDialog(false);
    } catch (err) {
      setError('Failed to save resource. Please try again.');
      console.error('Error saving resource:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resource: Resource) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;

    try {
      setLoading(true);
      await deleteResource(resource.id);
      setResources(prev => prev.filter(r => r.id !== resource.id));
    } catch (err) {
      setError('Failed to delete resource. Please try again.');
      console.error('Error deleting resource:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Resources</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenDialog()}
        >
          Add Resource
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {resources.map(resource => (
          <Grid item xs={12} sm={6} md={4} key={resource.id}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {resource.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {resource.description}
              </Typography>
              <Box display="flex" gap={1} mb={2}>
                <Chip label={resource.type} color="primary" variant="outlined" />
                <Chip
                  label={`Quantity: ${resource.quantity}`}
                  color="secondary"
                  variant="outlined"
                />
                <Chip
                  label={resource.status}
                  color={{
                    available: 'success',
                    deployed: 'warning',
                    unavailable: 'error'
                  }[resource.status] as any}
                />
              </Box>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleOpenDialog(resource)}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => handleDelete(resource)}
                >
                  Delete
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedResource ? 'Edit Resource' : 'Add Resource'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Name"
                fullWidth
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Type"
                fullWidth
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                {resourceTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Quantity"
                type="number"
                fullWidth
                value={formData.quantity}
                onChange={e =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Status"
                fullWidth
                value={formData.status}
                onChange={e =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="deployed">Deployed</MenuItem>
                <MenuItem value="unavailable">Unavailable</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Latitude"
                type="number"
                fullWidth
                value={formData.latitude}
                onChange={e =>
                  setFormData({ ...formData, latitude: parseFloat(e.target.value) })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Longitude"
                type="number"
                fullWidth
                value={formData.longitude}
                onChange={e =>
                  setFormData({
                    ...formData,
                    longitude: parseFloat(e.target.value)
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Contact Information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Contact Name"
                fullWidth
                value={formData.contact_info.name}
                onChange={e =>
                  setFormData({
                    ...formData,
                    contact_info: {
                      ...formData.contact_info,
                      name: e.target.value
                    }
                  })
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Phone"
                fullWidth
                value={formData.contact_info.phone}
                onChange={e =>
                  setFormData({
                    ...formData,
                    contact_info: {
                      ...formData.contact_info,
                      phone: e.target.value
                    }
                  })
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Email"
                fullWidth
                value={formData.contact_info.email}
                onChange={e =>
                  setFormData({
                    ...formData,
                    contact_info: {
                      ...formData.contact_info,
                      email: e.target.value
                    }
                  })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResourceManagement;