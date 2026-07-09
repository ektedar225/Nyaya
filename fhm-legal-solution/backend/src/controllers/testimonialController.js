const { supabase } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/testimonials — public
const listTestimonials = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_featured', true)
    .order('sort_order', { ascending: true });

  if (error) throw new ApiError(500, 'Failed to fetch testimonials.', error.message);
  res.json({ success: true, data });
});

// GET /api/admin/testimonials — admin, includes non-featured rows
const adminListTestimonials = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw new ApiError(500, 'Failed to fetch testimonials.', error.message);
  res.json({ success: true, data });
});

// POST /api/admin/testimonials
const createTestimonial = asyncHandler(async (req, res) => {
  const { client_name, client_city, rating, review_text, photo_url, is_featured, sort_order } = req.body;
  if (!client_name || !review_text) throw new ApiError(400, 'client_name and review_text are required.');

  const { data, error } = await supabase
    .from('testimonials')
    .insert({ client_name, client_city, rating, review_text, photo_url, is_featured, sort_order })
    .select()
    .single();

  if (error) throw new ApiError(500, 'Failed to create testimonial.', error.message);
  res.status(201).json({ success: true, data });
});

// PUT /api/admin/testimonials/:id
const updateTestimonial = asyncHandler(async (req, res) => {
  const { client_name, client_city, rating, review_text, photo_url, is_featured, sort_order } = req.body;

  const { data, error } = await supabase
    .from('testimonials')
    .update({ client_name, client_city, rating, review_text, photo_url, is_featured, sort_order })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) throw new ApiError(404, 'Testimonial not found.', error?.message);
  res.json({ success: true, data });
});

// DELETE /api/admin/testimonials/:id
const deleteTestimonial = asyncHandler(async (req, res) => {
  const { error } = await supabase.from('testimonials').delete().eq('id', req.params.id);
  if (error) throw new ApiError(500, 'Failed to delete testimonial.', error.message);
  res.json({ success: true, message: 'Testimonial deleted.' });
});

module.exports = {
  listTestimonials,
  adminListTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
};
