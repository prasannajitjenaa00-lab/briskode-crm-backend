/**
 * Wrapper around WhatsApp Cloud API (Meta).
 */
const BASE_URL = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || 'v20.0'}`;

const call = async (path, body) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(`WhatsApp API error: ${data.error.message}`);
  return data;
};

const phoneNumberId = () => process.env.WHATSAPP_PHONE_NUMBER_ID;

const sendTextMessage = async (to, text) => {
  return call(`/${phoneNumberId()}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  });
};

const sendTemplateMessage = async (to, templateName, languageCode = 'en_US', components = []) => {
  return call(`/${phoneNumberId()}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: { name: templateName, language: { code: languageCode }, components },
  });
};

const sendMediaMessage = async (to, mediaType, link, caption) => {
  return call(`/${phoneNumberId()}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: mediaType, // image | video | document
    [mediaType]: { link, caption },
  });
};

module.exports = { sendTextMessage, sendTemplateMessage, sendMediaMessage };
