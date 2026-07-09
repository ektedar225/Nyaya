const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/generateToken');
const { supabase } = require('../config/supabase');

// Protects every admin-only route. Expects: Authorization: Bearer <token>
const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw new ApiError(401, 'Not authorized. No token provided.');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      throw new ApiError(401, 'Not authorized. Token is invalid or expired.');
    }

    // Confirm the admin still exists (in case they were removed after the
    // token was issued).
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, name, email')
      .eq('id', decoded.id)
      .single();

    if (error || !admin) {
      throw new ApiError(401, 'Not authorized. Admin account no longer exists.');
    }

    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireAuth };
