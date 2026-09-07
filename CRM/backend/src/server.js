require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./socket');
const { checkRedisHealth } = require('./config/redis');
const { startWebhookRetryWorker } = require('./jobs/webhookRetry.job');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  // Check Redis before starting background workers
  try {
    const isRedisRunning = await checkRedisHealth();
    if (isRedisRunning) {
      startWebhookRetryWorker();
      console.log('[Jobs] Webhook retry worker initialized with Redis.');
    } else {
      console.log('[Redis] Redis server not detected (optional). Background retry queue disabled.');
    }
  } catch (err) {
    console.warn('[Jobs] Could not start webhook retry worker:', err.message);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Meta CRM backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('[Fatal] Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });
};

start();
