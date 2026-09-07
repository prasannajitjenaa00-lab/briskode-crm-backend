const IORedis = require('ioredis');
const net = require('net');

let connection = null;
let redisAvailable = null;

const checkRedisHealth = () => {
  if (process.env.ENABLE_REDIS === 'false') {
    redisAvailable = false;
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
      let hostname = '127.0.0.1';
      let port = 6379;
      try {
        const parsed = new URL(redisUrl);
        hostname = parsed.hostname === 'localhost' ? '127.0.0.1' : parsed.hostname;
        port = parsed.port ? parseInt(parsed.port, 10) : 6379;
      } catch (_) {}

      const socket = net.createConnection({ port, host: hostname, timeout: 600 });
      socket.on('connect', () => {
        socket.destroy();
        redisAvailable = true;
        resolve(true);
      });
      socket.on('error', () => {
        socket.destroy();
        redisAvailable = false;
        resolve(false);
      });
      socket.on('timeout', () => {
        socket.destroy();
        redisAvailable = false;
        resolve(false);
      });
    } catch (_) {
      redisAvailable = false;
      resolve(false);
    }
  });
};

const isRedisReady = () => {
  return redisAvailable === true;
};

const getRedisConnection = () => {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 1000, 3000);
      },
    });
    connection.on('error', (err) => {
      if (redisAvailable) {
        console.error('[Redis] error:', err.message);
      }
    });
  }
  return connection;
};

module.exports = { getRedisConnection, checkRedisHealth, isRedisReady };
