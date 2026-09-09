const express = require('express');
const router = express.Router();
const extCtrl = require('../controllers/extendedController');

router.post('/portfolio', extCtrl.addPortfolioImage);
router.get('/portfolio/:artisan_id', extCtrl.getPortfolio);

router.post('/quotes', extCtrl.createQuoteRequest);
router.get('/quotes', extCtrl.getQuoteRequests);

router.get('/transactions/:user_id', extCtrl.getTransactionHistory);

module.exports = router;
