import { Request as ExpressRequest, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export type AuthenticatedRequest = ExpressRequest & {
  user?: {
    id: string;
    name: string;
    role: string;
  };
};

export interface JWTPayload {
  userId: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const payload = decoded as JWTPayload;
    
    try {
      const result = await pool.query('SELECT id, name, role FROM "users" WHERE id = $1', [payload.userId]);
      
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'User not found' });
      }

      req.user = {
        id: payload.userId,
        name: result.rows[0].name,
        role: result.rows[0].role
      };
      
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  });
}
