const express = require('express');
const router = express.Router();
const {
  listAdvocates,
  getAdvocateBySlug,
} = require('../controllers/advocateController');

// Public routes — mounted at /api/advocates
router.get('/', listAdvocates);
router.get('/:slug', getAdvocateBySlug);

module.exports = router;
