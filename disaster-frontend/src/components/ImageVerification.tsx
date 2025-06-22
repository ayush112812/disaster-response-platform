import { useState } from 'react';
import { 
  Paper, 
  Title, 
  Text, 
  Button, 
  Stack, 
  Group, 
  TextInput, 
  Alert, 
  Badge, 
  LoadingOverlay,
  ActionIcon,
  Tooltip,
  Card,
  Image,
  Progress
} from '@mantine/core';
import { 
  IconPhoto, 
  IconUpload, 
  IconCheck, 
  IconX, 
  IconAlertTriangle,
  IconBrain,
  IconRefresh
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { verifyImage } from '../services/api';

interface ImageVerificationProps {
  disasterId: string;
  onVerificationComplete?: (result: any) => void;
  title?: string;
}

interface VerificationResult {
  isAuthentic: boolean;
  confidence: number;
  analysis: string;
  reportId: string;
}

export function ImageVerification({ disasterId, onVerificationComplete, title = "Image Verification" }: ImageVerificationProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleVerifyImage = async () => {
    if (!imageUrl.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter an image URL',
        color: 'red'
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const result = await verifyImage(disasterId, imageUrl);
      setVerificationResult(result);
      setUploadProgress(100);
      
      onVerificationComplete?.(result);

      notifications.show({
        title: 'Verification Complete',
        message: `Image ${result.isAuthentic ? 'verified' : 'flagged'} with ${Math.round(result.confidence * 100)}% confidence`,
        color: result.isAuthentic ? 'green' : 'orange'
      });
    } catch (error) {
      notifications.show({
        title: 'Verification Failed',
        message: error instanceof Error ? error.message : 'Failed to verify image',
        color: 'red'
      });
    } finally {
      clearInterval(progressInterval);
      setIsVerifying(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleReset = () => {
    setImageUrl('');
    setVerificationResult(null);
    setUploadProgress(0);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'yellow';
    return 'red';
  };

  return (
    <Paper p="md" withBorder radius="md" style={{ position: 'relative' }}>
      <LoadingOverlay visible={isVerifying} />
      
      <Group justify="space-between" mb="md">
        <Group>
          <IconPhoto size={20} />
          <Title order={4}>{title}</Title>
        </Group>
        {verificationResult && (
          <Badge 
            color={verificationResult.isAuthentic ? 'green' : 'orange'}
            variant="filled"
          >
            {verificationResult.isAuthentic ? 'Verified' : 'Flagged'}
          </Badge>
        )}
      </Group>

      <Stack gap="md">
        <Group>
          <TextInput
            placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            style={{ flex: 1 }}
            leftSection={<IconPhoto size={16} />}
          />
          <Tooltip label="Verify image authenticity using AI">
            <Button
              onClick={handleVerifyImage}
              loading={isVerifying}
              disabled={!imageUrl.trim()}
              leftSection={<IconBrain size={16} />}
            >
              Verify
            </Button>
          </Tooltip>
          {(imageUrl || verificationResult) && (
            <ActionIcon 
              variant="light" 
              onClick={handleReset}
              color="gray"
            >
              <IconRefresh size={16} />
            </ActionIcon>
          )}
        </Group>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div>
            <Text size="sm" mb="xs">Analyzing image...</Text>
            <Progress value={uploadProgress} animated />
          </div>
        )}

        {imageUrl && !isVerifying && (
          <Card withBorder>
            <Text size="sm" c="dimmed" mb="xs">Preview:</Text>
            <Image
              src={imageUrl}
              alt="Image to verify"
              height={200}
              fit="contain"
              fallbackSrc="https://via.placeholder.com/400x200?text=Image+Not+Found"
            />
          </Card>
        )}

        {verificationResult && (
          <Alert
            icon={verificationResult.isAuthentic ? <IconCheck size={16} /> : <IconAlertTriangle size={16} />}
            title="Verification Results"
            color={verificationResult.isAuthentic ? 'green' : 'orange'}
            variant="light"
          >
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Status: {verificationResult.isAuthentic ? 'Authentic' : 'Potentially Manipulated'}
                </Text>
                <Badge 
                  color={getConfidenceColor(verificationResult.confidence)}
                  variant="filled"
                  size="sm"
                >
                  {Math.round(verificationResult.confidence * 100)}% Confidence
                </Badge>
              </Group>
              
              <Text size="sm">
                <strong>Analysis:</strong> {verificationResult.analysis}
              </Text>
              
              <Text size="xs" c="dimmed">
                Report ID: {verificationResult.reportId}
              </Text>
            </Stack>
          </Alert>
        )}

        <Alert color="blue" variant="light">
          <Text size="sm">
            💡 <strong>AI Image Verification:</strong> Our system analyzes images for authenticity, 
            checking for signs of manipulation, deepfakes, or AI-generated content. 
            This helps ensure the reliability of disaster reports.
          </Text>
        </Alert>
      </Stack>
    </Paper>
  );
}
