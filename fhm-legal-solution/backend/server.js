require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./src/routes');
const { notFound, errorHandler } = require('./src/middleware/errorMiddleware');
const { generalLimiter } = require('./src/middleware/rateLimiter');

const app = express();

// ── Security & parsing middleware ──
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── CORS ──
// Only your GitHub Pages origin(s) (and any custom domain) may call this API.
// Set CLIENT_ORIGINS in .env as a comma-separated list.
const allowedOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server / curl / Postman requests with no origin header.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  })
);

app.use('/api', generalLimiter);

// ── Health check (useful for Render's health check + uptime pings) ──
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'FHM-Legal-Solution API is running.', timestamp: new Date().toISOString() });
});

// ── API routes ──
app.use('/api', routes);

// ── 404 + error handling (must be last) ──
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FHM-Legal-Solution API listening on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
