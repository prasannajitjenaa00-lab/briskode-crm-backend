const WhatsAppMessage = require('../models/WhatsAppMessage');
const Broadcast = require('../models/Broadcast');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, paginated } = require('../utils/apiResponse');
const whatsapp = require('../services/whatsappService');
const { emitBroadcast } = require('../socket');

// GET /api/whatsapp/webhook — verification handshake
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = (process.env.WHATSAPP_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || 'dev_meta_verify_token').trim();

  if (mode === 'subscribe' && token === expectedToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// POST /api/whatsapp/webhook — inbound messages + delivery/read status updates
const receiveWebhook = asyncHandler(async (req, res) => {
  res.sendStatus(200);

  for (const entry of req.body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};

      // Inbound messages
      for (const msg of value.messages || []) {
        const lead = await Lead.findOne({ phone: msg.from });
        const customer = lead ? await Customer.findOne({ phone: msg.from }) : null;

        const record = await WhatsAppMessage.create({
          direction: 'inbound',
          waMessageId: msg.id,
          from: msg.from,
          to: value.metadata?.display_phone_number,
          lead: lead?._id,
          customer: customer?._id,
          type: msg.type,
          body: msg.text?.body,
          status: 'delivered',
        });

        emitBroadcast('whatsapp:inbound', record);
      }

      // Delivery / read status updates
      for (const status of value.statuses || []) {
        await WhatsAppMessage.findOneAndUpdate({ waMessageId: status.id }, { status: status.status });
      }
    }
  }
});

// GET /api/whatsapp/conversations/:phone — conversation history with a lead/customer
const getConversation = asyncHandler(async (req, res) => {
  const { phone } = req.params;
  const messages = await WhatsAppMessage.find({ $or: [{ from: phone }, { to: phone }] }).sort({ createdAt: 1 });
  ok(res, messages, 'Conversation history fetched');
});

// POST /api/whatsapp/send — send a single text/media/template message
const sendMessage = asyncHandler(async (req, res) => {
  const { to, type = 'text', body, mediaUrl, templateName, leadId, customerId } = req.body;

  let result;
  if (type === 'template') {
    result = await whatsapp.sendTemplateMessage(to, templateName);
  } else if (['image', 'video', 'document'].includes(type)) {
    result = await whatsapp.sendMediaMessage(to, type, mediaUrl, body);
  } else {
    result = await whatsapp.sendTextMessage(to, body);
  }

  const record = await WhatsAppMessage.create({
    direction: 'outbound',
    waMessageId: result.messages?.[0]?.id,
    from: process.env.WHATSAPP_PHONE_NUMBER_ID,
    to,
    lead: leadId,
    customer: customerId,
    type,
    body,
    mediaUrl,
    templateName,
    status: 'sent',
  });

  ok(res, record, 'Message sent', 201);
});

// ---- Broadcasts (bulk WhatsApp campaigns) ----

// GET /api/whatsapp/broadcasts
const listBroadcasts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25 } = req.query;
  const [broadcasts, total] = await Promise.all([
    Broadcast.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Broadcast.countDocuments(),
  ]);
  paginated(res, broadcasts, page, limit, total, 'Broadcasts fetched');
});

// POST /api/whatsapp/broadcasts — create + queue a broadcast to a filtered audience
const createBroadcast = asyncHandler(async (req, res) => {
  const { name, templateName, messageBody, mediaUrl, audienceFilter = {} } = req.body;

  const recipients = await Lead.find(audienceFilter).select('phone fullName _id');
  const broadcast = await Broadcast.create({
    name,
    templateName,
    messageBody,
    mediaUrl,
    audienceFilter,
    recipientCount: recipients.length,
    status: 'queued',
    createdBy: req.user._id,
  });

  // Fire sends (simple sequential loop; for very large lists this should go through BullMQ)
  let sentCount = 0;
  let failedCount = 0;
  for (const recipient of recipients) {
    try {
      if (!recipient.phone) throw new Error('Missing phone number');
      const result = templateName
        ? await whatsapp.sendTemplateMessage(recipient.phone, templateName)
        : await whatsapp.sendTextMessage(recipient.phone, messageBody);

      await WhatsAppMessage.create({
        direction: 'outbound',
        waMessageId: result.messages?.[0]?.id,
        to: recipient.phone,
        lead: recipient._id,
        type: templateName ? 'template' : 'text',
        body: messageBody,
        templateName,
        status: 'sent',
        broadcast: broadcast._id,
      });
      sentCount += 1;
    } catch (err) {
      failedCount += 1;
    }
  }

  broadcast.sentCount = sentCount;
  broadcast.failedCount = failedCount;
  broadcast.status = 'completed';
  broadcast.completedAt = new Date();
  await broadcast.save();

  emitBroadcast('broadcast:completed', broadcast);
  ok(res, broadcast, `Broadcast "${name}" completed: ${sentCount} sent, ${failedCount} failed`, 201);
});

module.exports = {
  verifyWebhook,
  receiveWebhook,
  getConversation,
  sendMessage,
  listBroadcasts,
  createBroadcast,
};
