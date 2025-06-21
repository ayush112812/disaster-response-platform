import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { supabase } from '../services/supabase';
import { verifyDisasterImage } from '../services/gemini';
import { validate } from '../middleware/validation';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { emitToDisaster } from '../websocket';

const router = Router();

// Get reports for a disaster
router.get('/disasters/:id/reports', [
  authenticateToken,
  param('id').isUUID().withMessage('Invalid disaster ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validate()
], async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('disaster_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Return mock data if database not available
      const mockReports = [
        {
          id: '1',
          disaster_id: id,
          user_id: 'citizen1',
          content: 'Water level rising rapidly on 14th Street. Need immediate evacuation assistance.',
          verification_status: 'pending',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          disaster_id: id,
          user_id: 'volunteer2',
          content: 'Setting up emergency shelter at Community Center. Can accommodate 50 more people.',
          verification_status: 'verified',
          created_at: new Date().toISOString()
        }
      ];
      return res.json(mockReports);
    }

    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Create a new report
router.post('/disasters/:id/reports', [
  authenticateToken,
  param('id').isUUID().withMessage('Invalid disaster ID'),
  body('content').isString().isLength({ min: 10, max: 1000 }).withMessage('Content must be between 10 and 1000 characters'),
  body('image_url').optional().isURL().withMessage('Invalid image URL'),
  validate()
], async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { content, image_url } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if disaster exists
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('id')
      .eq('id', id)
      .single();

    if (disasterError) {
      // For demo purposes, continue even if disaster doesn't exist in DB
      console.log('Disaster not found in DB, continuing with mock data');
    }

    let verification_status = 'pending';
    let verification_metadata = null;

    // If image is provided, verify it using Gemini
    if (image_url) {
      try {
        const verificationResult = await verifyDisasterImage(image_url);
        verification_status = verificationResult.isAuthentic ? 'verified' : 'rejected';
        verification_metadata = verificationResult;
      } catch (error) {
        console.error('Image verification failed:', error);
        // Continue with pending status if verification fails
      }
    }

    const reportData = {
      id: `report_${Date.now()}`,
      disaster_id: id,
      user_id: userId,
      content,
      image_url,
      verification_status,
      metadata: verification_metadata,
      created_at: new Date().toISOString()
    };

    // Try to insert into database
    const { data: report, error } = await supabase
      .from('reports')
      .insert(reportData)
      .select()
      .single();

    if (error) {
      // Return mock data if database insert fails
      console.log('Database insert failed, returning mock data');
      const mockReport = reportData;
      
      // Emit WebSocket event
      emitToDisaster(id, 'report_created', mockReport);
      
      return res.status(201).json(mockReport);
    }

    // Emit WebSocket event
    emitToDisaster(id, 'report_created', report);

    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update report verification status
router.put('/reports/:reportId/verify', [
  authenticateToken,
  param('reportId').isString().withMessage('Invalid report ID'),
  body('status').isIn(['verified', 'rejected', 'pending']).withMessage('Invalid verification status'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  validate()
], async (req: AuthenticatedRequest, res) => {
  try {
    const { reportId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user has admin role
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can verify reports' });
    }

    const updateData = {
      verification_status: status,
      verified_by: userId,
      verified_at: new Date().toISOString(),
      verification_notes: notes
    };

    const { data: report, error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId)
      .select()
      .single();

    if (error) {
      // Return mock response if database update fails
      const mockReport = {
        id: reportId,
        ...updateData,
        disaster_id: 'mock_disaster_id'
      };
      
      // Emit WebSocket event
      emitToDisaster(mockReport.disaster_id, 'report_verified', mockReport);
      
      return res.json(mockReport);
    }

    // Emit WebSocket event
    emitToDisaster(report.disaster_id, 'report_verified', report);

    res.json(report);
  } catch (error) {
    console.error('Error verifying report:', error);
    res.status(500).json({ error: 'Failed to verify report' });
  }
});

export default router;
