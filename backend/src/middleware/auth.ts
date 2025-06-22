import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabase';
import config from '../config';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

// Mock users for testing (as required by assignment)
const MOCK_USERS = {
  'netrunnerX': { userId: 'netrunnerX', role: 'admin' },
  'reliefAdmin': { userId: 'reliefAdmin', role: 'admin' },
  'citizen1': { userId: 'citizen1', role: 'contributor' },
  'volunteer2': { userId: 'volunteer2', role: 'contributor' }
};

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Check for mock user header (for testing as per assignment requirements)
  const mockUser = req.headers['x-user'] as string;
  if (mockUser && MOCK_USERS[mockUser]) {
    req.user = MOCK_USERS[mockUser];
    return next();
  }

  if (!token) {
    // For testing purposes, default to a mock user if no auth provided
    req.user = MOCK_USERS['citizen1'];
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; role: string };

    // Verify user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      // Fallback to mock user for testing
      req.user = MOCK_USERS['citizen1'];
      return next();
    }

    req.user = {
      userId: user.id,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    // Fallback to mock user for testing
    req.user = MOCK_USERS['citizen1'];
    next();
  }
}

export function authorizeRoles(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
  };
}
