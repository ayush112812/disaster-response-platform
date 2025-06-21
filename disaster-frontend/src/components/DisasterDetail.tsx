import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Grid, Chip, Button, CircularProgress, Alert } from '@mui/material';
import { Disaster, Resource, DisasterUpdate } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { fetchDisasterUpdates, fetchDisasterResources } from '../services/api';
import ResourceList from './ResourceList';
import UpdatesList from './UpdatesList';
import ImageGallery from './ImageGallery';

interface DisasterDetailProps {
  disaster: Disaster;
  onClose?: () => void;
}

const DisasterDetail: React.FC<DisasterDetailProps> = ({ disaster, onClose }) => {
  const [updates, setUpdates] = useState<DisasterUpdate[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useWebSocket();

  useEffect(() => {
    loadData();
  }, [disaster.id]);

  useEffect(() => {
    if (!socket) return;

    socket.on('disaster_update', (data: any) => {
      if (data.disasterId === disaster.id) {
        setUpdates(prev => [data, ...prev]);
      }
    });

    socket.on('resource_update', (data: any) => {
      if (data.disasterId === disaster.id) {
        setResources(prev =>
          prev.map(r => (r.id === data.resourceId ? { ...r, ...data } : r))
        );
      }
    });

    return () => {
      socket.off('disaster_update');
      socket.off('resource_update');
    };
  }, [socket, disaster.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [updatesData, resourcesData] = await Promise.all([
        fetchDisasterUpdates(disaster.id),
        fetchDisasterResources(disaster.id)
      ]);
      setUpdates(updatesData);
      setResources(resourcesData);
      setError(null);
    } catch (err) {
      setError('Failed to load disaster details');
      console.error('Error loading disaster details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Card sx={{ p: 3, maxWidth: '100%', overflow: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {disaster.title}
        </Typography>
        {onClose && (
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Details
            </Typography>
            <Typography variant="body1" paragraph>
              {disaster.description}
            </Typography>
            <Box display="flex" gap={1} mb={2}>
              <Chip
                label={`Type: ${disaster.disaster_type}`}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Severity: ${disaster.severity}`}
                color={{
                  high: 'error',
                  medium: 'warning',
                  low: 'info'
                }[disaster.severity] as any}
              />
              <Chip
                label={`Status: ${disaster.status}`}
                color={{
                  active: 'error',
                  resolved: 'success',
                  archived: 'default'
                }[disaster.status] as any}
              />
            </Box>
          </Box>

          {disaster.media_urls && disaster.media_urls.length > 0 && (
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                Images
              </Typography>
              <ImageGallery
                images={disaster.media_urls.map((url, index) => ({
                  url,
                  title: `Image ${index + 1}`,
                  verified: disaster.verified_at != null
                }))}
              />
            </Box>
          )}

          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Updates
            </Typography>
            <UpdatesList
              updates={updates}
              disasterId={disaster.id}
              onUpdateAdded={(update) => setUpdates(prev => [update, ...prev])}
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Location
            </Typography>
            <Typography variant="body1">
              Latitude: {disaster.latitude}
              <br />
              Longitude: {disaster.longitude}
            </Typography>
          </Box>

          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Timeline
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reported: {new Date(disaster.reported_at).toLocaleString()}
              {disaster.verified_at && (
                <>
                  <br />
                  Verified: {new Date(disaster.verified_at).toLocaleString()}
                </>
              )}
              {disaster.resolved_at && (
                <>
                  <br />
                  Resolved: {new Date(disaster.resolved_at).toLocaleString()}
                </>
              )}
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Resources
            </Typography>
            <ResourceList
              resources={resources}
              disasterId={disaster.id}
              onResourceAdded={(resource) => setResources(prev => [...prev, resource])}
              onResourceUpdated={(resource) =>
                setResources(prev =>
                  prev.map(r => (r.id === resource.id ? resource : r))
                )
              }
            />
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
};

export default DisasterDetail;