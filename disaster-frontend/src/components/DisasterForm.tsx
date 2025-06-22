import { useState } from 'react';
import { TextInput, Textarea, MultiSelect, Button, Stack, Paper, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDisaster, updateDisaster } from '../services/api';

interface DisasterFormProps {
  disaster?: {
    id: string;
    title: string;
    description: string;
    location_name: string;
    tags: string[];
  };
  onSuccess?: () => void;
}

const AVAILABLE_TAGS = [
  'flood',
  'earthquake',
  'fire',
  'hurricane',
  'tornado',
  'urgent',
  'medical',
  'shelter',
  'food',
  'water'
];

export function DisasterForm({ disaster, onSuccess }: DisasterFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: disaster?.title || '',
    description: disaster?.description || '',
    location_name: disaster?.location_name || '',
    tags: disaster?.tags || []
  });

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => {
      return disaster
        ? updateDisaster(disaster.id, data)
        : createDisaster({
            ...data,
            severity: 'medium' as const,
            status: 'active' as const,
            owner_id: 'anonymous'
          });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disasters'] });
      notifications.show({
        title: `Disaster ${disaster ? 'Updated' : 'Created'}`,
        message: `Successfully ${disaster ? 'updated' : 'created'} the disaster record.`,
        color: 'green'
      });
      onSuccess?.();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'An error occurred',
        color: 'red'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Paper p="md" radius="md">
      <Title order={2} mb="md">{disaster ? 'Edit Disaster' : 'Report New Disaster'}</Title>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            required
            label="Title"
            placeholder="Enter disaster title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <TextInput
            required
            label="Location"
            placeholder="Enter location name"
            value={formData.location_name}
            onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
          />
          <Textarea
            required
            label="Description"
            placeholder="Describe the disaster situation"
            minRows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <MultiSelect
            label="Tags"
            placeholder="Select tags"
            data={AVAILABLE_TAGS}
            value={formData.tags}
            onChange={(value) => setFormData({ ...formData, tags: value })}
            searchable
          />
          <Button type="submit" loading={mutation.isPending}>
            {disaster ? 'Update Disaster' : 'Report Disaster'}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}