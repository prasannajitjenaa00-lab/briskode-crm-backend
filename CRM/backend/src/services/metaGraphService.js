/**
 * Thin wrapper around Meta Graph API calls used for Lead Ads.
 * Requires: axios (add to deps if not present) — using global fetch (Node 18+) to avoid extra dep.
 */
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v20.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

const graphGet = async (path, params = {}, accessToken) => {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  if (accessToken) url.searchParams.append('access_token', accessToken);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(`Meta Graph API error: ${data.error.message}`);
  return data;
};

// Exchange short-lived token for a long-lived token
const getLongLivedToken = async (shortLivedToken) => {
  return graphGet('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });
};

const getPages = async (userAccessToken) => {
  const data = await graphGet('/me/accounts', {}, userAccessToken);
  return data.data || [];
};

const getLeadForms = async (pageId, pageAccessToken) => {
  const data = await graphGet(`/${pageId}/leadgen_forms`, {}, pageAccessToken);
  return data.data || [];
};

// Fetch a single lead's field data by lead id (used when a webhook only sends the leadgen_id)
const getLeadDetails = async (leadId, pageAccessToken) => {
  const token = pageAccessToken || process.env.META_PAGE_ACCESS_TOKEN;
  return graphGet(`/${leadId}`, {}, token);
};

const getCampaignInsights = async (campaignId, accessToken) => {
  return graphGet(`/${campaignId}/insights`, {
    fields: 'impressions,clicks,spend,reach,ctr,cpc',
  }, accessToken);
};

module.exports = {
  getLongLivedToken,
  getPages,
  getLeadForms,
  getLeadDetails,
  getCampaignInsights,
};
