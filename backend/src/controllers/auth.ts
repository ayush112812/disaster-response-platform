import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { registerUser, loginUser, getCurrentUser } from '../services/auth';
import { supabase } from '../services/supabase';

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Username, email, and password are required' 
      });
    }

    const user = await registerUser(username, email, password);
    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Registration failed'
    });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    const { user, token } = await loginUser(email, password);
    
    res.json({
      status: 'success',
      data: {
        token,
        user
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({
      status: 'error',
      message: error.message || 'Authentication failed'
    });
  }
};

// Get current user profile
export const getProfile = async (req: any, res: Response) => {
  try {
    // The user is already attached to the request by the authenticateToken middleware
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        status: 'error',
        message: 'User not authenticated' 
      });
    }

    // Get fresh user data from the database
    const userData = await getCurrentUser(user.userId);
    
    res.json({
      status: 'success',
      data: {
        user: userData
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile'
    });
  }
};

// Change user password
export const changePassword = async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        status: 'error',
        message: 'User not authenticated' 
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Current password and new password are required' 
      });
    }

    // Get current user with password hash
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    res.json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password'
    });
  }
};
