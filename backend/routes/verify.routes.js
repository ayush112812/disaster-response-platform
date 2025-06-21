const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const geminiService = require('../services/gemini.service');
const db = require('../services/db.service');

// Verify an image
router.post('/image', [
  check('image_url').isURL().withMessage('Valid image URL is required'),
  check('disaster_id').optional().isUUID().withMessage('Valid disaster ID is required if provided'),
  check('user_id').notEmpty().withMessage('User ID is required for audit trail')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { image_url, disaster_id, user_id, context } = req.body;
    
    // Verify disaster exists if provided
    if (disaster_id) {
      const disaster = await db.getDisasterById(disaster_id);
      if (!disaster) {
        return res.status(404).json({ error: 'Disaster not found' });
      }
    }
    
    // Use Gemini to verify the image
    const verificationResult = await geminiService.verifyImage(image_url);
    
    // Create a report record
    const reportData = {
      disaster_id: disaster_id || null,
      user_id,
      content: context || 'Image verification request',
      image_url,
      verification_status: verificationResult.isAuthentic ? 'verified' : 'suspicious',
      metadata: {
        verification: verificationResult,
        context: context || null
      }
    };
    
    const report = await db.createReport(reportData);
    
    res.json({
      verified: verificationResult.isAuthentic,
      confidence: verificationResult.confidence,
      analysis: verificationResult.analysis,
      concerns: verificationResult.potentialConcerns,
      report_id: report.id
    });
    
  } catch (error) {
    console.error('Error verifying image:', error);
    res.status(500).json({ 
      error: 'Failed to verify image',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get verification status for a report
router.get('/report/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const { data: report, error } = await db.supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (error) throw error;
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({
      report_id: report.id,
      disaster_id: report.disaster_id,
      status: report.verification_status,
      verified: report.verification_status === 'verified',
      image_url: report.image_url,
      metadata: report.metadata,
      created_at: report.created_at
    });
    
  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({ 
      error: 'Failed to get verification status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all verifications for a disaster
router.get('/disaster/:disasterId', async (req, res) => {
  try {
    const { disasterId } = req.params;
    
    // Verify the disaster exists
    const disaster = await db.getDisasterById(disasterId);
    if (!disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    
    const { data: reports, error } = await db.supabase
      .from('reports')
      .select('*')
      .eq('disaster_id', disasterId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Group by verification status
    const grouped = reports.reduce((acc, report) => {
      if (!acc[report.verification_status]) {
        acc[report.verification_status] = [];
      }
      acc[report.verification_status].push(report);
      return acc;
    }, {});
    
    res.json({
      disaster_id: disasterId,
      total: reports.length,
      by_status: grouped,
      counts: Object.keys(grouped).reduce((acc, status) => ({
        ...acc,
        [status]: grouped[status].length
      }), {})
    });
    
  } catch (error) {
    console.error('Error getting disaster verifications:', error);
    res.status(500).json({ 
      error: 'Failed to get disaster verifications',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
