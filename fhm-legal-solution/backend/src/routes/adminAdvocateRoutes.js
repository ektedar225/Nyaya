const express = require('express');
const router = express.Router();
const {
  adminListAdvocates,
  adminGetAdvocate,
  createAdvocate,
  updateAdvocate,
  deleteAdvocate,
} = require('../controllers/advocateController');
const { requireAuth } = require('../middleware/authMiddleware');

// All routes here are mounted at /api/admin/advocates and require a valid JWT.
router.use(requireAuth);

router.get('/', adminListAdvocates);
router.get('/:id', adminGetAdvocate);
router.post('/', createAdvocate);
router.put('/:id', updateAdvocate);
router.delete('/:id', deleteAdvocate);

module.exports = router;
