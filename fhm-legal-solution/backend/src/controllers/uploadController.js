const { randomUUID } = require('crypto');
const path = require('path');
const { supabase, STORAGE_BUCKET } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// POST /api/admin/uploads/image  (multipart/form-data, field name "image")
// Uploads the file to Supabase Storage and returns its public URL. Only the
// URL is ever stored in PostgreSQL — the binary lives in Supabase Storage.
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded. Use field name "image".');

  const ext = path.extname(req.file.originalname) || '.jpg';
  const folder = req.body.folder && /^[a-z0-9_-]+$/i.test(req.body.folder) ? req.body.folder : 'general';
  const fileName = `${folder}/${randomUUID()}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (uploadError) throw new ApiError(500, 'Failed to upload image.', uploadError.message);

  const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

  res.status(201).json({
    success: true,
    data: { url: publicUrlData.publicUrl, path: fileName },
  });
});

// DELETE /api/admin/uploads/image  { path: "folder/filename.jpg" }
// Optional cleanup endpoint for when an admin replaces/removes a photo.
const deleteImage = asyncHandler(async (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) throw new ApiError(400, 'File path is required.');

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
  if (error) throw new ApiError(500, 'Failed to delete image.', error.message);

  res.json({ success: true, message: 'Image deleted.' });
});

module.exports = { uploadImage, deleteImage };
