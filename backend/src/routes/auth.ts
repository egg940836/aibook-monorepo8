import express from 'express';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const generateToken = (user: { id: string; name: string; role: string }): string => {
  return jwt.sign(
    {
      userId: user.id,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Allow login with either user ID or name
    const result = await pool.query('SELECT * FROM "users" WHERE name = $1 OR id = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken({
      id: user.id,
      name: user.name,
      role: user.role
    });
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: userWithoutPassword,
      token,
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const result = await pool.query('SELECT id, name, role FROM "users" WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: result.rows[0] });
    
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  // In a stateless JWT system, logout is mainly handled on the client side.
  res.json({ message: 'Logout successful' });
});

export default router;
