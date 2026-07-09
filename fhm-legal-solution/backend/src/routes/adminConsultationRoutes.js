const express = require('express');
const router = express.Router();
const {
  adminListConsultations,
  updateConsultationStatus,
  deleteConsultation,
} = require('../controllers/consultationController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', adminListConsultations);
router.put('/:id', updateConsultationStatus);
router.delete('/:id', deleteConsultation);

module.exports = router;
