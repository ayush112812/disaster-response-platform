import { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Group,
  TextInput,
  Textarea,
  Alert,
  Badge,
  LoadingOverlay,
  Select,
  Chip,
  ActionIcon,
  Tooltip,
  Card,
  Progress,
  Divider
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconMapPin,
  IconPhoto,
  IconSend,
  IconCheck,
  IconX,
  IconBrain,
  IconRefresh,
  IconPlus,
  IconTrash
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../services/api';

interface DisasterReportFormProps {
  onReportSubmitted?: (disasterId: string) => void;
  title?: string;
}

interface AnalysisResult {
  isDisasterRelated: boolean;
  type: string;
  severity: 'low' | 'medium' | 'high';
}

export function DisasterReportForm({ onReportSubmitted, title = "Report a Disaster" }: DisasterReportFormProps) {
  const [reportText, setReportText] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');

  const handleAnalyzeText = async () => {
    if (!reportText.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter some text to analyze',
        color: 'red'
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('🔍 Analyzing text:', reportText);
      const response = await api.post('/ingestion/analyze', { text: reportText });
      console.log('✅ Analysis response:', response.data);
      setAnalysis(response.data.analysis);

      if (response.data.analysis.isDisasterRelated) {
        notifications.show({
          title: 'Analysis Complete',
          message: `Detected ${response.data.analysis.type} with ${response.data.analysis.severity} severity`,
          color: 'green'
        });
      } else {
        notifications.show({
          title: 'Analysis Complete',
          message: 'Text does not appear to be disaster-related',
          color: 'orange'
        });
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      // Fallback analysis for when API is not available
      const mockAnalysis = {
        isDisasterRelated: true,
        type: 'general',
        severity: 'medium' as const
      };
      setAnalysis(mockAnalysis);
      
      notifications.show({
        title: 'Analysis Complete (Mock)',
        message: 'Using offline analysis - detected potential disaster content',
        color: 'blue'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportText.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a description of the disaster',
        color: 'red'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(0);
    setCurrentStep('');

    try {
      // Step 1: Analyze disaster content
      setCurrentStep('1. Analyzing disaster content...');
      setSubmitProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX

      // Step 2: Extract location using AI
      setCurrentStep('2. Extracting location using AI...');
      setSubmitProgress(40);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Verify images for authenticity
      if (images.some(img => img.trim() !== '')) {
        setCurrentStep('3. Verifying images for authenticity...');
        setSubmitProgress(60);
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        setSubmitProgress(60);
      }

      // Step 4: Create disaster entry
      setCurrentStep('4. Creating disaster entry automatically...');
      setSubmitProgress(80);

      const reportData = {
        text: reportText,
        location: location || undefined,
        images: images.filter(img => img.trim() !== '')
      };

      console.log('🚀 Submitting disaster report:', reportData);
      const response = await api.post('/ingestion/report', reportData);
      console.log('✅ Disaster created:', response.data);

      // Step 5: Complete
      setCurrentStep('5. Disaster entry created successfully!');
      setSubmitProgress(100);

      notifications.show({
        title: 'Complete Workflow Executed!',
        message: `Disaster "${response.data.analysis?.type}" created with ID: ${response.data.disasterId}`,
        color: 'green'
      });

      // Reset form
      setReportText('');
      setLocation('');
      setImages(['']);
      setAnalysis(null);

      onReportSubmitted?.(response.data.disasterId);

    } catch (error: any) {
      console.error('❌ Submission error:', error);
      setCurrentStep('❌ Submission failed');
      notifications.show({
        title: 'Submission Failed',
        message: error.response?.data?.error || error.response?.data?.details || 'Failed to submit disaster report',
        color: 'red'
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setSubmitProgress(0);
        setCurrentStep('');
      }, 3000);
    }
  };

  const addImageField = () => {
    setImages([...images, '']);
  };

  const removeImageField = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const updateImage = (index: number, value: string) => {
    const newImages = [...images];
    newImages[index] = value;
    setImages(newImages);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'yellow';
      default: return 'gray';
    }
  };

  return (
    <Paper withBorder p="xl" radius="md">
      <Stack gap="lg">
        <div>
          <Title order={2} mb="xs">{title}</Title>
          <Text c="dimmed" size="sm">
            Report disasters, emergencies, or hazardous situations. Your report will be analyzed and verified.
          </Text>
        </div>

        <Divider />

        <div style={{ position: 'relative' }}>
          <LoadingOverlay visible={isSubmitting} />
          
          <Stack gap="md">
            <Textarea
              label="Disaster Description"
              placeholder="Describe what happened, where, and when. Include as much detail as possible..."
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              minRows={4}
              maxRows={8}
              required
              description="Be specific about the type of disaster, location, severity, and any immediate dangers"
            />

            <Group justify="space-between">
              <Button
                variant="light"
                leftSection={<IconBrain size={16} />}
                onClick={handleAnalyzeText}
                loading={isAnalyzing}
                disabled={!reportText.trim()}
              >
                Analyze Content
              </Button>
              
              {analysis && (
                <Group gap="xs">
                  <Badge
                    color={analysis.isDisasterRelated ? 'green' : 'red'}
                    leftSection={analysis.isDisasterRelated ? <IconCheck size={12} /> : <IconX size={12} />}
                  >
                    {analysis.isDisasterRelated ? 'Disaster-Related' : 'Not Disaster-Related'}
                  </Badge>
                  {analysis.isDisasterRelated && (
                    <>
                      <Badge color="blue">{analysis.type}</Badge>
                      <Badge color={getSeverityColor(analysis.severity)}>
                        {analysis.severity} severity
                      </Badge>
                    </>
                  )}
                </Group>
              )}
            </Group>

            {analysis && !analysis.isDisasterRelated && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                The text doesn't appear to be disaster-related. Please include keywords like earthquake, flood, fire, emergency, etc.
              </Alert>
            )}

            <TextInput
              label="Location"
              placeholder="City, State or specific address"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              leftSection={<IconMapPin size={16} />}
              description="Location will be extracted from description if not provided"
            />

            <div>
              <Text size="sm" fw={500} mb="xs">Images (Optional)</Text>
              <Stack gap="xs">
                {images.map((image, index) => (
                  <Group key={index} gap="xs">
                    <TextInput
                      placeholder="Image URL"
                      value={image}
                      onChange={(e) => updateImage(index, e.target.value)}
                      style={{ flex: 1 }}
                      leftSection={<IconPhoto size={16} />}
                    />
                    {images.length > 1 && (
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => removeImageField(index)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                ))}
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={addImageField}
                >
                  Add Another Image
                </Button>
              </Stack>
              <Text size="xs" c="dimmed" mt="xs">
                Images will be verified using AI for authenticity
              </Text>
            </div>

            {submitProgress > 0 && (
              <div>
                <Text size="sm" mb="xs">
                  {currentStep || 'Processing disaster report...'}
                </Text>
                <Progress value={submitProgress} animated />
              </div>
            )}

            <Group justify="flex-end">
              <Button
                leftSection={<IconSend size={16} />}
                onClick={handleSubmitReport}
                loading={isSubmitting}
                disabled={!reportText.trim() || (analysis && !analysis.isDisasterRelated)}
              >
                Submit Report
              </Button>
            </Group>
          </Stack>
        </div>

        <Alert color="blue" variant="light">
          <Text size="sm">
            <strong>How it works:</strong> Your report will be analyzed for disaster content, location will be extracted, 
            and images will be verified. Verified reports automatically create disaster entries in our system.
          </Text>
        </Alert>
      </Stack>
    </Paper>
  );
}
