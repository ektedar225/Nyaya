const express = require('express');
const router = express.Router();
const { adminListSections, upsertSection } = require('../controllers/homepageController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', adminListSections);
router.put('/:sectionKey', upsertSection);

module.exports = router;
