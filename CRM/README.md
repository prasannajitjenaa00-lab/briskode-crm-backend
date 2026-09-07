# Meta Lead Ads CRM

A production backend (Node.js/Express/MongoDB) wired to your existing React CRM frontend. Built for Meta (Facebook/Instagram) Lead Ads, with WhatsApp Cloud API messaging, real-time notifications, and JWT authentication.

```
CRM/
├── frontend/     # your existing React app, unmodified in layout — now calls the real API
├── backend/      # Express + MongoDB API
└── .env.example
```

No Docker required — everything below runs with plain `npm install` / `npm run dev` against a MongoDB instance (local or Atlas) and, optionally, Redis.

## What changed in the frontend

- `src/context/AppContext.jsx` — every action (`addLead`, `createInvoice`, `toggleCampaignStatus`, etc.) now calls the backend instead of writing to `localStorage`. The exact same function names and shapes are exposed via `useApp()`, so no other component needed to change.
- `src/api/` — new Axios-based API modules (one file per resource) plus a Socket.IO client.
- `src/components/auth/LoginScreen.jsx` and `App.jsx` — a minimal login screen was added (styled with your existing CSS variables) because real auth requires it; this wasn't in the original mock app. No existing page was redesigned.
- Every object returned by the API gets `_id` mirrored to `.id` automatically (see `src/api/normalize.js`) so existing comparisons like `lead.id` keep working unchanged.
- `assignedAdminId` fields are kept as plain IDs (not populated objects), matching what your components already expect — they cross-reference the `users` array themselves.

## 1. Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Redis (for BullMQ webhook-retry queue — optional in dev; the server logs a warning and keeps running without it)
- A Meta Developer App with Lead Ads + WhatsApp Cloud API products added (for the live integrations)
- A Cloudinary account (for file uploads)

## 2. Environment Variables

Copy `.env.example` to `backend/.env` and fill in real values:

```bash
cp .env.example backend/.env
```

Key variables:
- `MONGO_URI` — your MongoDB connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — long random strings
- `META_APP_ID` / `META_APP_SECRET` / `META_VERIFY_TOKEN` — from your Meta App dashboard
- `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_VERIFY_TOKEN` — from WhatsApp Cloud API setup
- `CLOUDINARY_*` — from your Cloudinary dashboard

For the frontend, copy `frontend/.env.example` to `frontend/.env` and adjust `VITE_API_BASE_URL` / `VITE_SOCKET_URL` if not running on default ports.

## 3. MongoDB Setup

Any MongoDB 6+ instance works — pick whichever is easiest for you:

- **MongoDB Atlas (no local install)** — create a free cluster at mongodb.com/atlas, add your IP to the access list, create a database user, and paste the connection string into `MONGO_URI` (e.g. `mongodb+srv://user:pass@cluster0.mongodb.net/meta_crm`).
- **Local install** — install MongoDB Community Server for your OS from mongodb.com/try/download/community, start the `mongod` service, and use `MONGO_URI=mongodb://localhost:27017/meta_crm`.

## 3b. Redis Setup (optional)

Redis only powers the BullMQ webhook-retry queue. Skip it in dev if you don't need Meta webhook retries — the server logs a warning and runs fine without it.

- **Local install** — install Redis for your OS (e.g. `brew install redis` on macOS, or the Windows port / WSL on Windows), then run `redis-server`.
- **Managed** — a free-tier Redis Cloud instance works too; just point `REDIS_URL` at it.

## 4. Cloudinary Setup

1. Create a free account at cloudinary.com.
2. Copy your Cloud Name, API Key, and API Secret from the dashboard into `.env`.
3. Uploads (images, PDFs, video) go through `POST /api/uploads` and are stored in the `crm_uploads` folder.

## 5. Meta App Setup (Lead Ads)

1. Create an app at developers.facebook.com → add the **Facebook Login** and **Webhooks** products.
2. Under **Webhooks**, subscribe to the `leadgen` field on the `page` object.
3. Set the callback URL to `https://your-domain.com/api/meta/webhook` and the verify token to match `META_VERIFY_TOKEN`.
4. A Super Admin connects their Meta Business account from Settings (`POST /api/meta/connect` with a short-lived user token from the Facebook Login flow) — this stores long-lived tokens and syncs connected Pages.
5. Sync lead forms per page via `POST /api/meta/pages/:pageId/sync-forms`, then link each form to a campaign and an auto-assign admin (`PATCH /api/meta/forms/:id`).
6. New leads arrive in real time at the webhook, get deduplicated by email/phone, saved, and pushed to the assigned admin (or all Super Admins) via Socket.IO. Failed webhook events are logged and retried automatically through the BullMQ queue.

## 6. WhatsApp Cloud API Setup

1. In the same Meta App, add the **WhatsApp** product and note the test/production Phone Number ID.
2. Set the webhook callback to `https://your-domain.com/api/whatsapp/webhook`, verify token matching `WHATSAPP_VERIFY_TOKEN`.
3. Generate a permanent access token (System User token) and set `WHATSAPP_ACCESS_TOKEN`.
4. Send messages via `POST /api/whatsapp/send`, or bulk-send to a filtered lead audience via `POST /api/whatsapp/broadcasts`.

## 7. Run in Development

Backend:
```bash
cd backend
npm install
npm run seed   # creates a Super Admin — check console output for the login email/password
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Visit the frontend URL, sign in with the seeded Super Admin account, and you're in.

## 8. Run in Production (without Docker)

- **Backend**: run `npm install --omit=dev` on your server, set real environment variables (not `.env` in production — use your host's secret manager or env config), then run it under a process manager: `pm2 start src/server.js --name crm-backend` (or a systemd unit calling `node src/server.js`). Put it behind your own reverse proxy (Nginx/Caddy) for TLS.
- **Frontend**: run `npm run build`, which outputs static files to `frontend/dist/`. Serve that folder with any static host or web server (Nginx, Caddy, Vercel, Netlify, S3+CloudFront, etc.) — just make sure it rewrites unknown paths to `index.html` (SPA routing) and that `VITE_API_BASE_URL` / `VITE_SOCKET_URL` point at your deployed backend.

## 9. What's implemented vs. what to extend next

**Implemented:** JWT auth (access + refresh + logout + forgot/reset password), role/permission middleware matching your existing `permissions` object, full CRUD for Leads/Customers/Campaigns/Invoices/Announcements matching every action in the original `AppContext.jsx`, Customer 360 aggregate endpoint, Meta Lead Ads webhook ingestion with duplicate detection and auto-assignment, Meta Graph API helpers (OAuth token exchange, pages, lead forms, insights), WhatsApp Cloud API send/receive/broadcast, Socket.IO real-time notifications, Cloudinary file uploads, invoice PDF generation, dashboard KPI/analytics aggregations, audit logging, rate limiting, Helmet/CORS/Mongo-sanitize hardening, and Swagger + Postman docs.

**Recommended next steps** (left as follow-ups given the scope of this system):
- Add Swagger JSDoc annotations directly on each route file for a fully interactive `/api/docs` (the schema/tag scaffolding is already in place).
- Wire the actual Facebook Login SDK / OAuth redirect flow in the frontend Settings page to obtain the `shortLivedToken` passed to `POST /api/meta/connect`.
- Add automated tests (Jest/Supertest) for the controllers.
- Move large WhatsApp broadcast sends fully onto a BullMQ worker (currently sequential in-request for simplicity) to handle very large audiences without request timeouts.
