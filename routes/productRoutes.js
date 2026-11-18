const express = require('express');
const router = express.Router();
const {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getLowStockProducts,
    getCategorySummary,
    updateStock
} = require('../controllers/productController');

// Specific routes must come before parameterized routes to avoid conflict
router.route('/low-stock').get(getLowStockProducts);
router.route('/summary').get(getCategorySummary);

router.route('/').get(getProducts).post(createProduct);

router
    .route('/:id')
    .get(getProductById)
    .put(updateProduct)
    .delete(deleteProduct);

router.route('/:id/stock').patch(updateStock);

module.exports = router;