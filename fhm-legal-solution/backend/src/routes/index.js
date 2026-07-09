const express = require('express');
const router = express.Router();

// ── Public routes (read by the static frontend, no auth needed) ──
router.use('/advocates', require('./advocateRoutes'));
router.use('/homepage', require('./homepageRoutes'));
router.use('/practice-areas', require('./practiceAreaRoutes'));
router.use('/testimonials', require('./testimonialRoutes'));
router.use('/consultations', require('./consultationRoutes'));
router.use('/auth', require('./authRoutes'));

// ── Admin routes (JWT-protected inside each router via requireAuth) ──
router.use('/admin/advocates', require('./adminAdvocateRoutes'));
router.use('/admin/homepage', require('./adminHomepageRoutes'));
router.use('/admin/practice-areas', require('./adminPracticeAreaRoutes'));
router.use('/admin/testimonials', require('./adminTestimonialRoutes'));
router.use('/admin/consultations', require('./adminConsultationRoutes'));
router.use('/admin/uploads', require('./adminUploadRoutes'));

module.exports = router;
