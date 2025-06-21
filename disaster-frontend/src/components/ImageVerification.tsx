import React, { useState } from 'react';
import {
  Box,
  Card,
  CardMedia,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { verifyImage } from '../services/api';

interface ImageVerificationProps {
  imageUrl: string;
  disasterType: string;
  location: string;
  onVerificationComplete?: (result: {
    isValid: boolean;
    confidence: number;
    analysis: string;
  }) => void;
}

const ImageVerification: React.FC<ImageVerificationProps> = ({
  imageUrl,
  disasterType,
  location,
  onVerificationComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    isValid: boolean;
    confidence: number;
    analysis: string;
  } | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const handleVerification = async () => {
    try {
      setLoading(true);
      setError(null);
      const verificationResult = await verifyImage(imageUrl, disasterType, location);
      setResult(verificationResult);
      if (onVerificationComplete) {
        onVerificationComplete(verificationResult);
      }
    } catch (err) {
      setError('Failed to verify image. Please try again.');
      console.error('Image verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Card sx={{ position: 'relative', mb: 2 }}>
        <CardMedia
          component="img"
          image={imageUrl}
          alt="Disaster image"
          sx={{
            height: 300,
            objectFit: 'cover',
            filter: loading ? 'blur(2px)' : 'none'
          }}
        />
        {loading && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            bgcolor="rgba(0, 0, 0, 0.5)"
          >
            <CircularProgress color="primary" />
            <Typography color="white" mt={2}>
              Verifying image...
            </Typography>
          </Box>
        )}
        {result && (
          <Box
            position="absolute"
            top={8}
            right={8}
            bgcolor={result.isValid ? 'success.main' : 'error.main'}
            color="white"
            p={1}
            borderRadius={1}
            display="flex"
            alignItems="center"
            gap={1}
          >
            {result.isValid ? <CheckCircleIcon /> : <ErrorIcon />}
            <Typography variant="body2">
              {result.isValid ? 'Verified' : 'Unverified'}
            </Typography>
          </Box>
        )}
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Box mb={2}>
          <Typography variant="subtitle1" gutterBottom>
            Confidence Score
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <LinearProgress
              variant="determinate"
              value={result.confidence * 100}
              sx={{ flexGrow: 1 }}
              color={result.isValid ? 'success' : 'error'}
            />
            <Typography variant="body2">
              {Math.round(result.confidence * 100)}%
            </Typography>
          </Box>
          <Button
            variant="text"
            color="primary"
            onClick={() => setShowAnalysis(true)}
            sx={{ mt: 1 }}
          >
            View Analysis
          </Button>
        </Box>
      )}

      {!result && (
        <Button
          variant="contained"
          color="primary"
          onClick={handleVerification}
          disabled={loading}
          fullWidth
        >
          Verify Image
        </Button>
      )}

      <Dialog
        open={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Image Analysis</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {result?.analysis}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalysis(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImageVerification;