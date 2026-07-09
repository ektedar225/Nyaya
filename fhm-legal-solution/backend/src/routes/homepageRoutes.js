const express = require('express');
const router = express.Router();
const { getAllContent, getSection } = require('../controllers/homepageController');

router.get('/', getAllContent);
router.get('/:sectionKey', getSection);

module.exports = router;
