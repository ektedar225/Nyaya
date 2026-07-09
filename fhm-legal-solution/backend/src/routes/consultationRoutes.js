const express = require('express');
const router = express.Router();
const { createConsultation } = require('../controllers/consultationController');

router.post('/', createConsultation);

module.exports = router;
