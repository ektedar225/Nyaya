const express = require('express');
const router = express.Router();
const { listTestimonials } = require('../controllers/testimonialController');

router.get('/', listTestimonials);

module.exports = router;
