const express = require('express');
const router = express.Router();
const { uploadImage, deleteImage } = require('../controllers/uploadController');
const { requireAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(requireAuth);

router.post('/image', upload.single('image'), uploadImage);
router.delete('/image', deleteImage);

module.exports = router;
