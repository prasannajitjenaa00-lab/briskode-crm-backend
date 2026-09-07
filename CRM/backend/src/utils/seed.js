/**
 * Seeds a single Super Admin account so you can log in on first run.
 * Usage: npm run seed
 */
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Settings = require('../models/Settings');
const mongoose = require('mongoose');

const run = async () => {
  await connectDB();

  const existing = await User.findOne({ role: 'super_admin' });
  if (existing) {
    console.log(`[Seed] Super admin already exists: ${existing.email}`);
    process.exit(0);
  }

  const superAdmin = await User.create({
    name: 'Super Admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@briskode.com',
    password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
    role: 'super_admin',
    title: 'Executive Command & Operations',
    permissions: {
      canManageLeads: true,
      canViewAssignedCampaignsOnly: false,
      canExportData: true,
      canCreateInvoices: true,
      canEditSettings: true,
    },
  });

  await Settings.findOneAndUpdate({ key: 'global' }, { key: 'global' }, { upsert: true });

  console.log(`[Seed] Created super admin: ${superAdmin.email}`);
  console.log(`[Seed] Login with the password from SEED_ADMIN_PASSWORD (or the default — change it immediately).`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
