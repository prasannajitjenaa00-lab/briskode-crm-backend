const { Queue, Worker } = require('bullmq');
const { getRedisConnection, isRedisReady } = require('../config/redis');

const QUEUE_NAMES = {
  WEBHOOK_RETRY: 'webhook-retry',
  WHATSAPP_SEND: 'whatsapp-send',
  REPORT_GENERATION: 'report-generation',
};

const queues = {};

const getQueue = (name) => {
  if (!isRedisReady()) {
    return {
      add: async (jobName, data) => {
        console.warn(`[Queue Mock] Skipped queuing job "${jobName}" in "${name}" (Redis is offline).`);
        return null;
      },
    };
  }
  if (!queues[name]) {
    queues[name] = new Queue(name, { connection: getRedisConnection() });
  }
  return queues[name];
};

const registerWorker = (name, processor, opts = {}) => {
  if (!isRedisReady()) {
    return null;
  }
  return new Worker(name, processor, { connection: getRedisConnection(), ...opts });
};

module.exports = { QUEUE_NAMES, getQueue, registerWorker };
