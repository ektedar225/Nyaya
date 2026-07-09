const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Fail loudly at boot rather than silently returning empty data later.
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables. Check your .env file.'
  );
}

// The service_role key bypasses Row Level Security. This is intentional:
// the Express API is the only thing that talks to Supabase, and it enforces
// its own auth via the JWT middleware. NEVER send this key to the frontend.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'advocate-images';

module.exports = { supabase, STORAGE_BUCKET };
