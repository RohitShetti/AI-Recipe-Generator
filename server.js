import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './src/config.js';
import recipeRoutes from './src/routes/recipeRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Basic security & parsing middleware
app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// Serve frontend static assets from public/ directory
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// API routes
app.use('/api', recipeRoutes);

// Catch-all route to serve index.html for frontend navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// 404 handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// Start Express server
const PORT = config.port;
let server;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🍳 AI Recipe Generator Server Running!`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🤖 Model: ${config.geminiModel}`);
    console.log(`🔑 API Key Configured: ${config.isApiKeyConfigured ? 'YES (Secure on server)' : 'NO (Add GEMINI_API_KEY in .env)'}`);
    console.log(`=========================================`);
  });
}

export { app, server };
export default app;
