const { supabase } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// POST /api/consultations — public. Called from the "Book Consultation" form.
const createConsultation = asyncHandler(async (req, res) => {
  const { advocate_id, name, phone, email, message } = req.body;

  if (!name || !phone) throw new ApiError(400, 'Name and phone are required.');

  const { data, error } = await supabase
    .from('consultations')
    .insert({ advocate_id: advocate_id || null, name, phone, email, message })
    .select()
    .single();

  if (error) throw new ApiError(500, 'Failed to submit consultation request.', error.message);
  res.status(201).json({ success: true, data, message: 'Consultation request received. We will contact you shortly.' });
});

// GET /api/admin/consultations — admin, with optional ?status= filter
const adminListConsultations = asyncHandler(async (req, res) => {
  let query = supabase
    .from('consultations')
    .select('*, advocates(name, slug)')
    .order('created_at', { ascending: false });

  if (req.query.status) query = query.eq('status', req.query.status);

  const { data, error } = await query;
  if (error) throw new ApiError(500, 'Failed to fetch consultations.', error.message);
  res.json({ success: true, data });
});

// PUT /api/admin/consultations/:id — update status (new / contacted / closed)
const updateConsultationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['new', 'contacted', 'closed'];
  if (!allowed.includes(status)) throw new ApiError(400, `Status must be one of: ${allowed.join(', ')}`);

  const { data, error } = await supabase
    .from('consultations')
    .update({ status })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) throw new ApiError(404, 'Consultation not found.', error?.message);
  res.json({ success: true, data });
});

// DELETE /api/admin/consultations/:id
const deleteConsultation = asyncHandler(async (req, res) => {
  const { error } = await supabase.from('consultations').delete().eq('id', req.params.id);
  if (error) throw new ApiError(500, 'Failed to delete consultation.', error.message);
  res.json({ success: true, message: 'Consultation deleted.' });
});

module.exports = {
  createConsultation,
  adminListConsultations,
  updateConsultationStatus,
  deleteConsultation,
};
