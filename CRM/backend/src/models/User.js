const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const permissionsSchema = new mongoose.Schema(
  {
    canManageLeads: { type: Boolean, default: true },
    canViewAssignedCampaignsOnly: { type: Boolean, default: true },
    canExportData: { type: Boolean, default: false },
    canCreateInvoices: { type: Boolean, default: false },
    canEditSettings: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['super_admin', 'admin'], default: 'admin', index: true },
    avatar: { type: String, default: '' },
    title: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    lastActive: { type: String, default: 'Just created' },
    assignedCampaignIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' }],
    permissions: { type: permissionsSchema, default: () => ({}) },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
