import { useState } from 'react';
import { TextInput, Select, Button, Stack, Paper, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createResource, Resource } from '../services/api';

interface ResourceFormProps {
  disasterId: string;
  resource?: Resource;
  onSuccess?: () => void;
}

const RESOURCE_TYPES = [
  { value: 'food', label: 'Food' },
  { value: 'water', label: 'Water' },
  { value: 'shelter', label: 'Shelter' },
  { value: 'medical', label: 'Medical' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'other', label: 'Other' }
];

export function ResourceForm({ disasterId, resource, onSuccess }: ResourceFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: resource?.name || '',
    description: resource?.description || '',
    location_name: resource?.location_name || '',
    type: resource?.type || '',
    quantity: resource?.quantity || 1
  });

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => createResource(disasterId, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', disasterId] });
      notifications.show({
        title: 'Resource Added',
        message: 'Successfully added the resource.',
        color: 'green'
      });
      onSuccess?.();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to add resource',
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
      <Title order={2} mb="md">Add Resource</Title>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            required
            label="Name"
            placeholder="Enter resource name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextInput
            required
            label="Description"
            placeholder="Enter resource description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <TextInput
            required
            label="Location"
            placeholder="Enter location name"
            value={formData.location_name}
            onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
          />
          <TextInput
            required
            label="Quantity"
            type="number"
            placeholder="Enter quantity"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
          />
          <Select
            required
            label="Type"
            placeholder="Select resource type"
            data={RESOURCE_TYPES}
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value || '' })}
          />
          <Button type="submit" loading={mutation.isPending}>
            Add Resource
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}