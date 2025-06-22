import { useState } from 'react';
import { TextInput, Textarea, Button, Stack, Paper, Title, Text, Alert, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { verifyImage } from '../services/api';
import { ImageVerification } from './ImageVerification';

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
  const [verificationResults, setVerificationResults] = useState<any[]>([]);

  const handleImageVerificationComplete = (result: any) => {
    setVerificationResults(prev => [...prev, result]);
    notifications.show({
      title: 'Image Verification Added',
      message: `Image ${result.isAuthentic ? 'verified' : 'flagged'} and added to report`,
      color: result.isAuthentic ? 'green' : 'orange'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically submit the report to your backend
    // For now, we'll just show a success notification
    notifications.show({
      title: 'Report Submitted',
      message: `Your report has been submitted successfully${verificationResults.length > 0 ? ` with ${verificationResults.length} verified image(s)` : ''}.`,
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
            minRows={4}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          />

          <Divider my="md" />

          <ImageVerification
            disasterId={disasterId}
            onVerificationComplete={handleImageVerificationComplete}
            title="Verify Report Images"
          />

          {verificationResults.length > 0 && (
            <Alert color="green" variant="light">
              <Text size="sm" fw={500} mb="xs">
                ✅ {verificationResults.length} image(s) verified for this report
              </Text>
              {verificationResults.map((result, index) => (
                <Text key={index} size="xs" c="dimmed">
                  • Image {index + 1}: {result.isAuthentic ? 'Authentic' : 'Flagged'}
                  ({Math.round(result.confidence * 100)}% confidence)
                </Text>
              ))}
            </Alert>
          )}

          <Button
            type="submit"
            disabled={!formData.content}
            size="md"
            leftSection={<IconCheck size={16} />}
          >
            Submit Report
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}