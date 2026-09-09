const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

router.get('/search', profileController.searchArtisans);

module.exports = router;
