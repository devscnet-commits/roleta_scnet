import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { uploadsDir } from './uploads.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

// In production the frontend build is served by this same server (same origin
// as /api and /uploads), set via FRONTEND_DIST_DIR. Local dev leaves this
// unset and uses the Vite dev server instead.
const frontendDist = process.env.FRONTEND_DIST_DIR;
if (frontendDist && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Roleta SCNET backend rodando na porta ${port}`));
