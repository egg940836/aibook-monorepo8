import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { initializeDatabase } from './scripts/initDatabase';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import analysisRoutes from './routes/analyses';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// --- NEW, MORE ROBUST CORS CONFIGURATION ---
const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) {
  console.warn("WARNING: FRONTEND_URL environment variable not set. CORS might not work correctly in production.");
}

const corsOptions = {
  origin: frontendUrl,
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// --- END OF NEW CONFIGURATION ---

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analyses', analysisRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    console.log('Attempting to initialize database...');
    await initializeDatabase();
    console.log('Database initialization check complete.');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    (process as any).exit(1);
  }
}

startServer();
