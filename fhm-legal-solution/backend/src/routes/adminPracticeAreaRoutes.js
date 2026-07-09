const express = require('express');
const router = express.Router();
const {
  adminListPracticeAreas,
  createPracticeArea,
  updatePracticeArea,
  deletePracticeArea,
} = require('../controllers/practiceAreaController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', adminListPracticeAreas);
router.post('/', createPracticeArea);
router.put('/:id', updatePracticeArea);
router.delete('/:id', deletePracticeArea);

module.exports = router;
