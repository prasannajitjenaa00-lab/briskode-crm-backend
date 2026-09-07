const crypto = require('crypto');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok } = require('../utils/apiResponse');

// GET /api/users  (Team Directory)
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: 1 });
  ok(res, users, 'Users fetched');
});

// POST /api/users  (createAdmin)
const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, title, phone, location, role, permissions } = req.body;
  const exists = await User.findOne({ email: email?.toLowerCase() });
  if (exists) throw new ApiError(409, 'A user with this email already exists.');

  // The frontend's Add Admin form doesn't collect a password, so generate a
  // secure temporary one and return it once — the admin should reset it on first login.
  const tempPassword = req.body.password || crypto.randomBytes(9).toString('base64url');

  const user = await User.create({
    name,
    email,
    password: tempPassword,
    title,
    phone,
    location,
    role: role === 'super_admin' ? 'admin' : role || 'admin', // only the seed script can create super_admin
    permissions,
    lastActive: 'Just created',
  });

  await AuditLog.create({ user: req.user._id, action: 'admin.create', entity: 'User', entityId: user._id, ip: req.ip });
  ok(res, { ...user.toObject(), tempPassword: req.body.password ? undefined : tempPassword }, 'Admin created successfully', 201);
});

// PATCH /api/users/:id  (updateAdmin)
const updateAdmin = asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  delete updates.password; // password change should go through a dedicated endpoint
  delete updates.email;

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found.');

  await AuditLog.create({ user: req.user._id, action: 'admin.update', entity: 'User', entityId: user._id, ip: req.ip });
  ok(res, user, 'Admin updated successfully');
});

// DELETE /api/users/:id?reassignTo=<userId>  (deleteAdmin, reassigns owned records)
const deleteAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reassignTo } = req.query;

  const target = await User.findById(id);
  if (!target) throw new ApiError(404, 'User not found.');
  if (target.role === 'super_admin') throw new ApiError(400, 'Cannot delete the root Super Admin account.');
  if (!reassignTo) throw new ApiError(400, 'reassignTo query param is required to safely reassign owned records.');

  await Promise.all([
    Campaign.updateMany({ assignedAdminId: id }, { assignedAdminId: reassignTo }),
    Lead.updateMany({ assignedAdminId: id }, { assignedAdminId: reassignTo }),
    Invoice.updateMany({ assignedAdminId: id }, { assignedAdminId: reassignTo }),
    Customer.updateMany({ assignedAdminId: id }, { assignedAdminId: reassignTo }),
  ]);

  await target.deleteOne();
  await AuditLog.create({ user: req.user._id, action: 'admin.delete', entity: 'User', entityId: id, ip: req.ip });

  ok(res, null, 'Admin removed and owned records reassigned.');
});

module.exports = { listUsers, createAdmin, updateAdmin, deleteAdmin };
