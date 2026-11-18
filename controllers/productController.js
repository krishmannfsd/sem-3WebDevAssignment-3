const Product = require('../models/Product');

// @desc    Create a product
// @route   POST /api/products
const createProduct = async(req, res, next) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all products with filtering, sorting, pagination
// @route   GET /api/products
const getProducts = async(req, res, next) => {
    try {
        let queryObj = {...req.query };
        const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
        excludedFields.forEach((el) => delete queryObj[el]);

        // Filtering by category or search term
        if (req.query.search) {
            queryObj.name = { $regex: req.query.search, $options: 'i' };
        }

        let query = Product.find(queryObj);

        // Sorting
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;
        const total = await Product.countDocuments(queryObj);

        query = query.skip(startIndex).limit(limit);

        const products = await query;

        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit) || 1,
            count: products.length,
            products
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
const getProductById = async(req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            res.status(404);
            throw new Error('Product not found');
        }
        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

// @desc    Update product details
// @route   PUT /api/products/:id
const updateProduct = async(req, res, next) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!product) {
            res.status(404);
            throw new Error('Product not found');
        }
        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
const deleteProduct = async(req, res, next) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            res.status(404);
            throw new Error('Product not found');
        }
        res.status(200).json({
            message: 'Product deleted',
            id: req.params.id
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get low stock alert report (quantity <= reorderLevel)
// @route   GET /api/products/low-stock
const getLowStockProducts = async(req, res, next) => {
    try {
        const products = await Product.find({
            $expr: { $lte: ['$quantity', '$reorderLevel'] }
        });
        res.status(200).json({
            count: products.length,
            lowStockItems: products
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Category-wise inventory summary using Aggregation
// @route   GET /api/products/summary
const getCategorySummary = async(req, res, next) => {
    try {
        const summary = await Product.aggregate([{
                $group: {
                    _id: '$category',
                    totalItems: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' },
                    totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
                    avgPrice: { $avg: '$price' }
                }
            },
            {
                $sort: { totalStockValue: -1 }
            }
        ]);

        res.status(200).json({
            categories: summary.length,
            summary
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Safely increment/decrement stock (restock or sale)
// @route   PATCH /api/products/:id/stock
const updateStock = async(req, res, next) => {
    try {
        const { change } = req.body; // e.g., +10 or -5
        if (typeof change !== 'number') {
            res.status(400);
            throw new Error('Change amount must be a valid number');
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            res.status(404);
            throw new Error('Product not found');
        }

        const newQuantity = product.quantity + change;
        if (newQuantity < 0) {
            res.status(400);
            throw new Error('Insufficient stock for this operation');
        }

        product.quantity = newQuantity;
        await product.save();

        res.status(200).json({
            message: 'Stock updated',
            product
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getLowStockProducts,
    getCategorySummary,
    updateStock
};