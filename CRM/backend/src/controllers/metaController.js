const MetaAccount = require('../models/MetaAccount');
const FacebookPage = require('../models/FacebookPage');
const LeadForm = require('../models/LeadForm');
const MetaWebhookLog = require('../models/MetaWebhookLog');
const Lead = require('../models/Lead');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok } = require('../utils/apiResponse');
const metaGraph = require('../services/metaGraphService');
const { processLeadgenChange } = require('../services/metaLeadProcessor');
const { QUEUE_NAMES, getQueue } = require('../jobs/queue');

// GET /api/meta/webhook  — Meta's verification handshake (subscribe)
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expectedToken = (process.env.META_VERIFY_TOKEN || 'dev_meta_verify_token').trim();

  if (mode === 'subscribe' && token && token.trim() === expectedToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// POST /api/meta/webhook — receives real-time leadgen events
const receiveWebhook = asyncHandler(async (req, res) => {
  // Always ack fast so Meta doesn't retry/disable the webhook
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== 'page') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue;

      const log = await MetaWebhookLog.create({
        objectType: 'leadgen',
        payload: change.value,
        status: 'received',
      });

      try {
        await processLeadgenChange(change.value, log._id);
        log.status = 'processed';
        await log.save();
      } catch (err) {
        log.status = 'failed';
        log.error = err.message;
        await log.save();
        // enqueue for retry with exponential backoff
        await getQueue(QUEUE_NAMES.WEBHOOK_RETRY).add(
          'retry-leadgen',
          { logId: log._id },
          { attempts: 5, backoff: { type: 'exponential', delay: 5000 } }
        );
      }
    }
  }
});

// GET /api/meta/webhook-logs
const listWebhookLogs = asyncHandler(async (req, res) => {
  const logs = await MetaWebhookLog.find().sort({ createdAt: -1 }).limit(200);
  ok(res, logs, 'Webhook logs fetched');
});

// POST /api/meta/webhook-logs/:id/retry
const retryWebhookLog = asyncHandler(async (req, res) => {
  const log = await MetaWebhookLog.findById(req.params.id);
  if (!log) throw new ApiError(404, 'Webhook log not found.');

  log.status = 'retrying';
  await log.save();
  await getQueue(QUEUE_NAMES.WEBHOOK_RETRY).add('retry-leadgen', { logId: log._id }, { attempts: 3 });

  ok(res, log, 'Webhook event re-queued for processing');
});

// POST /api/meta/connect  — exchange a short-lived user token for long-lived + store pages
const connectMetaAccount = asyncHandler(async (req, res) => {
  const { shortLivedToken } = req.body;
  const longLived = await metaGraph.getLongLivedToken(shortLivedToken);

  const metaAccount = await MetaAccount.findOneAndUpdate(
    { user: req.user._id },
    {
      user: req.user._id,
      longLivedToken: longLived.access_token,
      tokenExpiresAt: new Date(Date.now() + (longLived.expires_in || 5184000) * 1000),
      connected: true,
    },
    { upsert: true, new: true }
  );

  const pages = await metaGraph.getPages(longLived.access_token);
  for (const p of pages) {
    await FacebookPage.findOneAndUpdate(
      { pageId: p.id },
      { metaAccount: metaAccount._id, pageId: p.id, pageName: p.name, pageAccessToken: p.access_token, connected: true },
      { upsert: true }
    );
  }

  ok(res, { metaAccount, pagesConnected: pages.length }, 'Meta Business account connected successfully');
});

// GET /api/meta/pages
const listPages = asyncHandler(async (req, res) => {
  const pages = await FacebookPage.find();
  ok(res, pages, 'Connected Facebook pages fetched');
});

// POST /api/meta/pages/:pageId/sync-forms
const syncLeadForms = asyncHandler(async (req, res) => {
  const page = await FacebookPage.findOne({ pageId: req.params.pageId }).select('+pageAccessToken');
  if (!page) throw new ApiError(404, 'Page not found or not connected.');

  const forms = await metaGraph.getLeadForms(page.pageId, page.pageAccessToken);
  const saved = [];
  for (const f of forms) {
    const form = await LeadForm.findOneAndUpdate(
      { formId: f.id },
      { page: page._id, formId: f.id, formName: f.name, status: f.status, lastSyncedAt: new Date() },
      { upsert: true, new: true }
    );
    saved.push(form);
  }

  ok(res, saved, `Synced ${saved.length} lead forms from page ${page.pageName}`);
});

// GET /api/meta/forms
const listLeadForms = asyncHandler(async (req, res) => {
  const forms = await LeadForm.find().populate('page', 'pageName').populate('linkedCampaign', 'name').populate('autoAssignAdminId', 'name');
  ok(res, forms, 'Lead forms fetched');
});

// PATCH /api/meta/forms/:id  (link to campaign / set auto-assign admin)
const updateLeadForm = asyncHandler(async (req, res) => {
  const form = await LeadForm.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!form) throw new ApiError(404, 'Lead form not found.');
  ok(res, form, 'Lead form updated');
});

module.exports = {
  verifyWebhook,
  receiveWebhook,
  listWebhookLogs,
  retryWebhookLog,
  connectMetaAccount,
  listPages,
  syncLeadForms,
  listLeadForms,
  updateLeadForm,
};
