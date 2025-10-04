import express from 'express';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    let query = 'SELECT * FROM "analyses"';
    let params: string[] = [];
    if (req.user?.role !== 'admin') {
      query += ' WHERE ("uploaderId" = $1 OR "isPublic" = true)';
      params.push(req.user!.id);
    }
    query += ' ORDER BY "date" DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { videoName, modelUsed } = req.body;
    const uploaderId = req.user!.id;
    const uploaderName = req.user!.name;
    const result = await pool.query(`
      INSERT INTO "analyses" ("videoName", "status", "progressMessage", "uploaderId", "uploaderName", "modelUsed", "thumbnailUrl") 
      VALUES ($1, 'processing', 'In queue', $2, $3, $4, '')
      RETURNING *
    `, [videoName, uploaderId, uploaderName, modelUsed]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user!.id;
  
    delete updates.id;
    delete updates.uploaderId;
    delete updates.uploaderName;
    delete updates.date;
  
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No update fields provided.' });
    }
  
    try {
      const analysisRes = await pool.query('SELECT "uploaderId" FROM "analyses" WHERE id = $1', [id]);
      if (analysisRes.rows.length === 0) {
        return res.status(404).json({ error: 'Analysis not found' });
      }
      if (analysisRes.rows[0].uploaderId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: You can only update your own analyses.' });
      }
  
      const fields = Object.keys(updates).map((key, index) => `"${key}" = $${index + 2}`).join(', ');
      const values = Object.values(updates);
  
      const query = `UPDATE "analyses" SET ${fields} WHERE id = $1 RETURNING *`;
      const result = await pool.query(query, [id, ...values]);
  
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating analysis:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const userId = req.user!.id;
  
    try {
      const analysisRes = await pool.query('SELECT "uploaderId" FROM "analyses" WHERE id = $1', [id]);
  
      if (analysisRes.rows.length === 0) {
        return res.status(204).send();
      }
  
      if (analysisRes.rows[0].uploaderId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own analyses.' });
      }
  
      await pool.query('DELETE FROM "analyses" WHERE id = $1', [id]);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
