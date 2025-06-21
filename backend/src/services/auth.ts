import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from './supabase';
import config from '../config';

const SALT_ROUNDS = 10;

export async function registerUser(username: string, email: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      username,
      email,
      password_hash: hashedPassword,
      role: 'user'
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return user;
}

export async function loginUser(email: string, password: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return { 
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }, 
    token 
  };
}

export async function getCurrentUser(userId: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, email, role')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  return user;
}
