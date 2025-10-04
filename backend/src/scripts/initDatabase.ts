import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" VARCHAR(255) PRIMARY KEY, "name" VARCHAR(255) NOT NULL,
        "password" VARCHAR(255) NOT NULL, "role" VARCHAR(50) NOT NULL DEFAULT 'user'
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "analyses" (
        "id" SERIAL PRIMARY KEY, "videoName" VARCHAR(255) NOT NULL, "thumbnailUrl" TEXT,
        "videoUrl" TEXT, "status" VARCHAR(50) NOT NULL, "progressMessage" VARCHAR(255),
        "preliminaryResult" JSONB, "fullResult" JSONB, "totalScore" INTEGER,
        "grade" VARCHAR(10), "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "uploaderId" VARCHAR(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "uploaderName" VARCHAR(255) NOT NULL, "isPublic" BOOLEAN NOT NULL DEFAULT false,
        "modelUsed" VARCHAR(255)
      );
    `);
    const demoPasswordHash = await bcrypt.hash('demo', 12);
    const adminPasswordHash = await bcrypt.hash('admin', 12);
    await client.query(`
      INSERT INTO "users" ("id", "name", "password", "role") VALUES 
        ('user-123', 'Demo User', $1, 'user'),
        ('admin-001', 'Administrator', $2, 'admin')
      ON CONFLICT ("id") DO NOTHING;
    `, [demoPasswordHash, adminPasswordHash]);
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}
