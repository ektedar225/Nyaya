const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');
const { generateToken } = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('id, name, email, password_hash')
    .eq('email', email.toLowerCase().trim())
    .single();

  // Same generic message whether the email doesn't exist or the password is
  // wrong — don't reveal which one to an attacker.
  if (error || !admin) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const isMatch = await bcrypt.compare(password, admin.password_hash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const token = generateToken({ id: admin.id, email: admin.email });

  res.json({
    success: true,
    data: {
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    },
  });
});

// GET /api/auth/me  (requires token) — lets the admin dashboard verify the
// stored token is still valid on page load.
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { admin: req.admin } });
});

// POST /api/auth/change-password  (requires token)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password are required.');
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters.');
  }

  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('id, password_hash')
    .eq('id', req.admin.id)
    .single();

  if (error || !admin) throw new ApiError(404, 'Admin not found.');

  const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
  if (!isMatch) throw new ApiError(401, 'Current password is incorrect.');

  const newHash = await bcrypt.hash(newPassword, 12);
  const { error: updateError } = await supabase
    .from('admin_users')
    .update({ password_hash: newHash })
    .eq('id', admin.id);

  if (updateError) throw new ApiError(500, 'Failed to update password.');

  res.json({ success: true, message: 'Password updated successfully.' });
});

module.exports = { login, getMe, changePassword };
