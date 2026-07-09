const { supabase } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/homepage — public. Returns every section as { hero: {...}, footer: {...}, ... }
// so the frontend can do one fetch and read whatever keys it needs.
const getAllContent = asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('homepage_content').select('section_key, content');
  if (error) throw new ApiError(500, 'Failed to fetch homepage content.', error.message);

  const merged = {};
  for (const row of data) merged[row.section_key] = row.content;

  res.json({ success: true, data: merged });
});

// GET /api/homepage/:sectionKey — public, single section.
const getSection = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('homepage_content')
    .select('content')
    .eq('section_key', req.params.sectionKey)
    .single();

  if (error || !data) throw new ApiError(404, `Section "${req.params.sectionKey}" not found.`);
  res.json({ success: true, data: data.content });
});

// GET /api/admin/homepage — admin, all sections with metadata (for the dashboard editor list).
const adminListSections = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('homepage_content')
    .select('*')
    .order('section_key', { ascending: true });

  if (error) throw new ApiError(500, 'Failed to fetch homepage content.', error.message);
  res.json({ success: true, data });
});

// PUT /api/admin/homepage/:sectionKey — admin. Upserts a section's JSON content.
// This single generic endpoint is what lets the admin manage hero text, footer,
// stats, social links, logos, etc. without ever needing a new DB migration —
// each section is just a JSON blob keyed by name.
const upsertSection = asyncHandler(async (req, res) => {
  const { sectionKey } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== 'object') {
    throw new ApiError(400, 'Request body must include a "content" object.');
  }

  const { data, error } = await supabase
    .from('homepage_content')
    .upsert({ section_key: sectionKey, content, updated_at: new Date().toISOString() }, { onConflict: 'section_key' })
    .select()
    .single();

  if (error) throw new ApiError(500, 'Failed to save section.', error.message);
  res.json({ success: true, data });
});

module.exports = { getAllContent, getSection, adminListSections, upsertSection };
