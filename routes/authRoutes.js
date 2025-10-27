// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { googleAuth, updateProfile } = require('../controllers/authController');

router.get('/google', googleAuth);
router.put('/profile', updateProfile);

module.exports = router;
