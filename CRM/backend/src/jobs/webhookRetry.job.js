const { QUEUE_NAMES, registerWorker } = require('./queue');
const MetaWebhookLog = require('../models/MetaWebhookLog');
const { processLeadgenChange } = require('../services/metaLeadProcessor');

/**
 * Worker that retries failed Meta webhook events (e.g. transient DB/API errors).
 */
const startWebhookRetryWorker = () => {
  const worker = registerWorker(QUEUE_NAMES.WEBHOOK_RETRY, async (job) => {
    const { logId } = job.data;
    const log = await MetaWebhookLog.findById(logId);
    if (!log) return;

    try {
      await processLeadgenChange(log.payload, log._id);
      log.status = 'processed';
      log.attempts += 1;
      await log.save();
    } catch (err) {
      log.status = 'failed';
      log.error = err.message;
      log.attempts += 1;
      await log.save();
      throw err; // let BullMQ retry per its backoff policy
    }
  });

  if (!worker) {
    return null;
  }

  worker.on('failed', (job, err) => {
    console.error(`[webhook-retry] job ${job.id} failed:`, err.message);
  });

  return worker;
};

module.exports = { startWebhookRetryWorker };
