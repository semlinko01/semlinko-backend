const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

router.post('/unlock', walletController.unlockContact);
router.post('/boost', walletController.boostProfile);

module.exports = router;
