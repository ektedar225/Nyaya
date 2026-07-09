const express = require('express');
const router = express.Router();
const {
  adminListTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = require('../controllers/testimonialController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', adminListTestimonials);
router.post('/', createTestimonial);
router.put('/:id', updateTestimonial);
router.delete('/:id', deleteTestimonial);

module.exports = router;
