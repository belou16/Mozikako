import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import searchRoutes from './routes/search.js';
import playlistRoutes from './routes/playlists.js';

const app = express();
const port = Number(process.env.API_PORT || 3001);

app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({
    ok: true,
    project: 'Mozikako',
    now: new Date().toISOString(),
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/playlists', playlistRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
  console.log(`Mozikako API running on http://localhost:${port}`);
});
