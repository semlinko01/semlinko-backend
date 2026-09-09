const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');

router.post('/products', marketController.createProduct);
router.get('/products', marketController.getProducts);

module.exports = router;
