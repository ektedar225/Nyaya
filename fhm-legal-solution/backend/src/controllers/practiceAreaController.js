const { supabase } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/practice-areas — public
const listPracticeAreas = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('practice_areas')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new ApiError(500, 'Failed to fetch practice areas.', error.message);
  res.json({ success: true, data });
});

// GET /api/admin/practice-areas — admin, includes inactive rows
const adminListPracticeAreas = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('practice_areas')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw new ApiError(500, 'Failed to fetch practice areas.', error.message);
  res.json({ success: true, data });
});

// POST /api/admin/practice-areas
const createPracticeArea = asyncHandler(async (req, res) => {
  const { title, description, icon, sort_order, is_active } = req.body;
  if (!title) throw new ApiError(400, 'Title is required.');

  const { data, error } = await supabase
    .from('practice_areas')
    .insert({ title, description, icon, sort_order, is_active })
    .select()
    .single();

  if (error) throw new ApiError(500, 'Failed to create practice area.', error.message);
  res.status(201).json({ success: true, data });
});

// PUT /api/admin/practice-areas/:id
const updatePracticeArea = asyncHandler(async (req, res) => {
  const { title, description, icon, sort_order, is_active } = req.body;

  const { data, error } = await supabase
    .from('practice_areas')
    .update({ title, description, icon, sort_order, is_active })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) throw new ApiError(404, 'Practice area not found.', error?.message);
  res.json({ success: true, data });
});

// DELETE /api/admin/practice-areas/:id
const deletePracticeArea = asyncHandler(async (req, res) => {
  const { error } = await supabase.from('practice_areas').delete().eq('id', req.params.id);
  if (error) throw new ApiError(500, 'Failed to delete practice area.', error.message);
  res.json({ success: true, message: 'Practice area deleted.' });
});

module.exports = {
  listPracticeAreas,
  adminListPracticeAreas,
  createPracticeArea,
  updatePracticeArea,
  deletePracticeArea,
};
