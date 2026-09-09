const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/buy-tokens', paymentController.initiateTokenPurchase);
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
