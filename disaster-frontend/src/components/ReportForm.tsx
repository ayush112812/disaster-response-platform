import { useState } from 'react';
import { TextInput, Textarea, Button, Stack, Paper, Title, Text, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconAlertCircle } from '@tabler/icons-react';
import { verifyImage } from '../services/api';

interface ReportFormProps {
  disasterId: string;
  onSuccess?: () => void;
}

export function ReportForm({ disasterId, onSuccess }: ReportFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    content: '',
    image_url: ''
  });
  const [verificationResult, setVerificationResult] = useState<{
    isAuthentic?: boolean;
    confidence?: number;
    details?: string;
  } | null>(null);

  const verifyMutation = useMutation({
    mutationFn: () => verifyImage(disasterId, formData.image_url),
    onSuccess: (data) => {
      setVerificationResult(data);
    },
    onError: (error) => {
      notifications.show({
        title: 'Verification Error',
        message: error instanceof Error ? error.message : 'Failed to verify image',
        color: 'red'
      });
    }
  });

  const handleVerifyImage = () => {
    if (!formData.image_url) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please provide an image URL to verify',
        color: 'red'
      });
      return;
    }
    verifyMutation.mutate();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically submit the report to your backend
    // For now, we'll just show a success notification
    notifications.show({
      title: 'Report Submitted',
      message: 'Your report has been submitted successfully.',
      color: 'green'
    });
    onSuccess?.();
  };

  return (
    <Paper p="md" radius="md">
      <Title order={2} mb="md">Submit Report</Title>
      <form onSubmit={handleSubmit}>
        <Stack>
          <Textarea
            required
            label="Report Content"
            placeholder="Describe the situation or provide additional information"
            minRows={3}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          />
          <TextInput
            label="Image URL"
            placeholder="Enter URL of the image to verify"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          />
          
          {formData.image_url && (
            <Button
              variant="light"
              onClick={handleVerifyImage}
              loading={verifyMutation.isPending}
            >
              Verify Image
            </Button>
          )}

          {verificationResult && (
            <Alert
              icon={<IconAlertCircle size="1rem" />}
              color={verificationResult.isAuthentic ? 'green' : 'red'}
              title="Image Verification Result"
            >
              <Text>Authenticity: {verificationResult.isAuthentic ? 'Authentic' : 'Potentially Manipulated'}</Text>
              {verificationResult.confidence && (
                <Text>Confidence: {(verificationResult.confidence * 100).toFixed(1)}%</Text>
              )}
              {verificationResult.details && (
                <Text size="sm" mt="xs">{verificationResult.details}</Text>
              )}
            </Alert>
          )}

          <Button
            type="submit"
            disabled={!formData.content}
            mt="md"
          >
            Submit Report
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}