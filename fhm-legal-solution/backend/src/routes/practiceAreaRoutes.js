const express = require('express');
const router = express.Router();
const { listPracticeAreas } = require('../controllers/practiceAreaController');

router.get('/', listPracticeAreas);

module.exports = router;
