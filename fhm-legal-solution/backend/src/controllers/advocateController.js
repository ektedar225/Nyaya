const { supabase } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const slugify = require('../utils/slugify');

// Fields returned to the PUBLIC frontend (homepage cards + profile page).
// Kept as an explicit list so nothing internal ever leaks to the browser.
const PUBLIC_COLUMNS = `
  id, slug, name, designation, court, city, state, experience_years, cases_won,
  rating, review_count, success_rate, languages, practice_tags, consultation_fee,
  fee_unit, is_available, is_featured, bar_council_text, photo_url, short_bio,
  long_bio, quote, quote_attribution, why_choose, practice_areas, fee_structure,
  achievements, reviews, phone, whatsapp, email, address, meta_title,
  meta_description, sort_order
`;

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC ENDPOINTS
// ────────────────────────────────────────────────────────────────────────────

// GET /api/advocates
// Powers the homepage lawyer grid. Supports optional filtering/sorting used
// by the existing filter bar (?city=&practiceArea=&language=&sort=).
const listAdvocates = asyncHandler(async (req, res) => {
  const { city, language, practiceArea, sort, featured } = req.query;

  let query = supabase.from('advocates').select(PUBLIC_COLUMNS);

  if (city && city !== 'All Cities') query = query.ilike('city', `%${city}%`);
  if (language) query = query.contains('languages', [language]);
  if (practiceArea) query = query.contains('practice_tags', [practiceArea]);
  if (featured === 'true') query = query.eq('is_featured', true);

  switch (sort) {
    case 'rating':
      query = query.order('rating', { ascending: false });
      break;
    case 'experience':
      query = query.order('experience_years', { ascending: false });
      break;
    case 'fee_low':
      query = query.order('consultation_fee', { ascending: true });
      break;
    default:
      query = query.order('sort_order', { ascending: true });
  }

  const { data, error } = await query;
  if (error) throw new ApiError(500, 'Failed to fetch advocates.', error.message);

  res.json({ success: true, data });
});

// GET /api/advocates/:slug — powers the single dynamic advocate.html page.
const getAdvocateBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const { data, error } = await supabase
    .from('advocates')
    .select(PUBLIC_COLUMNS)
    .eq('slug', slug)
    .single();

  if (error || !data) throw new ApiError(404, `No advocate found for slug "${slug}".`);

  res.json({ success: true, data });
});

// ────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS (all protected by requireAuth in the router)
// ────────────────────────────────────────────────────────────────────────────

// GET /api/admin/advocates — full record set, for the dashboard table.
const adminListAdvocates = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('advocates')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw new ApiError(500, 'Failed to fetch advocates.', error.message);
  res.json({ success: true, data });
});

// GET /api/admin/advocates/:id
const adminGetAdvocate = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('advocates')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) throw new ApiError(404, 'Advocate not found.');
  res.json({ success: true, data });
});

// Allow-list of columns the admin panel is permitted to write. Prevents
// accidental (or malicious) writes to id/created_at/etc via a raw body.
const WRITABLE_FIELDS = [
  'name', 'designation', 'court', 'city', 'state', 'experience_years', 'cases_won',
  'rating', 'review_count', 'success_rate', 'languages', 'practice_tags',
  'consultation_fee', 'fee_unit', 'is_available', 'is_featured', 'bar_council_text',
  'photo_url', 'short_bio', 'long_bio', 'quote', 'quote_attribution', 'why_choose',
  'practice_areas', 'fee_structure', 'achievements', 'reviews', 'phone', 'whatsapp',
  'email', 'address', 'meta_title', 'meta_description', 'sort_order', 'slug',
];

function pickWritable(body) {
  const out = {};
  for (const key of WRITABLE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

// POST /api/admin/advocates — create a new advocate.
const createAdvocate = asyncHandler(async (req, res) => {
  const payload = pickWritable(req.body);

  if (!payload.name) throw new ApiError(400, 'Advocate name is required.');

  // Auto-generate a unique slug from the name if one wasn't supplied.
  if (!payload.slug) {
    payload.slug = slugify(payload.name);
  }

  const { data: existing } = await supabase
    .from('advocates')
    .select('id')
    .eq('slug', payload.slug)
    .maybeSingle();

  if (existing) {
    throw new ApiError(409, `Slug "${payload.slug}" is already in use. Choose a different one.`);
  }

  const { data, error } = await supabase
    .from('advocates')
    .insert(payload)
    .select()
    .single();

  if (error) throw new ApiError(500, 'Failed to create advocate.', error.message);
  res.status(201).json({ success: true, data });
});

// PUT /api/admin/advocates/:id — update an existing advocate.
const updateAdvocate = asyncHandler(async (req, res) => {
  const payload = pickWritable(req.body);

  if (payload.slug) {
    const { data: existing } = await supabase
      .from('advocates')
      .select('id')
      .eq('slug', payload.slug)
      .neq('id', req.params.id)
      .maybeSingle();

    if (existing) {
      throw new ApiError(409, `Slug "${payload.slug}" is already used by another advocate.`);
    }
  }

  const { data, error } = await supabase
    .from('advocates')
    .update(payload)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) throw new ApiError(404, 'Advocate not found or update failed.', error?.message);
  res.json({ success: true, data });
});

// DELETE /api/admin/advocates/:id
const deleteAdvocate = asyncHandler(async (req, res) => {
  const { error } = await supabase.from('advocates').delete().eq('id', req.params.id);
  if (error) throw new ApiError(500, 'Failed to delete advocate.', error.message);
  res.json({ success: true, message: 'Advocate deleted.' });
});

module.exports = {
  listAdvocates,
  getAdvocateBySlug,
  adminListAdvocates,
  adminGetAdvocate,
  createAdvocate,
  updateAdvocate,
  deleteAdvocate,
};
