import express from 'express';
import Order from '../models/Order.js';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/orders
// @desc    Create a new order/reservation (buy)
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { listingId, quantity } = req.body;

    // Validation
    if (!listingId || !quantity) {
      return res.status(400).json({ 
        error: 'Listing ID and quantity are required' 
      });
    }

    const orderQuantity = parseInt(quantity);
    if (isNaN(orderQuantity) || orderQuantity <= 0) {
      return res.status(400).json({ 
        error: 'Quantity must be a positive integer' 
      });
    }

    // Get listing
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check if listing is available
    if (!listing.isAvailable()) {
      return res.status(400).json({ 
        error: 'Listing is not available' 
      });
    }

    // Check if enough units are available
    if (listing.availableUnits < orderQuantity) {
      return res.status(400).json({ 
        error: `Only ${listing.availableUnits} unit(s) available` 
      });
    }

    // Check if user is trying to buy their own listing
    if (listing.seller.toString() === req.user.id) {
      return res.status(400).json({ 
        error: 'You cannot reserve your own listing' 
      });
    }

    // Get buyer information
    const buyer = await User.findById(req.user.id);
    if (!buyer) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create order
    const order = await Order.create({
      buyer: req.user.id,
      listing: listingId,
      quantity: orderQuantity,
      unitPrice: listing.price,
      totalPrice: orderQuantity * listing.price,
      status: 'pending',
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      buyerPhone: buyer.email, // Use email if phone not available
      pickupLocation: listing.location,
      pickupWindowStart: listing.pickupWindowStart,
      pickupWindowEnd: listing.pickupWindowEnd
    });

    // Update listing availability
    listing.availableUnits -= orderQuantity;
    listing.updateStatus();
    await listing.save();

    // Populate order details
    await order.populate('listing', 'title description location pickupWindowStart pickupWindowEnd price unitLabel availableUnits seller');
    await order.populate('buyer', 'name email picture');
    await order.populate('listing.seller', 'name email');

    res.status(201).json({
      success: true,
      order: order.toJSON(),
      message: 'Reservation created successfully'
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ 
      error: 'Failed to create reservation',
      details: error.message 
    });
  }
});

// @route   GET /api/orders
// @desc    Get orders for the current user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, type = 'all' } = req.query;
    
    let query = {};
    
    // Filter by buyer or seller
    if (type === 'buying' || type === 'all') {
      query.buyer = req.user.id;
    } else if (type === 'selling') {
      // Get user's listings and find orders for those listings
      const userListings = await Listing.find({ seller: req.user.id }).select('_id');
      const listingIds = userListings.map(l => l._id);
      query.listing = { $in: listingIds };
    }
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const orders = await Order.find(query)
      .populate('listing', 'title description location pickupWindowStart pickupWindowEnd price unitLabel availableUnits image')
      .populate('buyer', 'name email picture')
      .sort({ createdAt: -1 })
      .lean();

    // Format orders for frontend
    const formattedOrders = orders.map(order => {
      const formatted = { ...order };
      
      // Keep raw pickupWindowStart and pickupWindowEnd dates for frontend formatting
      // Frontend will format these dates directly
      
      if (order.listing) {
        formatted.listingTitle = order.listing.title;
        formatted.listingLocation = order.listing.location;
      }
      
      return formatted;
    });

    res.json({
      success: true,
      orders: formattedOrders,
      count: formattedOrders.length
    });

  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      details: error.message 
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get a single order by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('listing', 'title description location pickupWindowStart pickupWindowEnd price image contactName contactEmail contactPhone')
      .populate('buyer', 'name email picture')
      .populate('listing.seller', 'name email picture');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user has permission to view this order
    const listing = await Listing.findById(order.listing._id);
    const isBuyer = order.buyer._id.toString() === req.user.id;
    const isSeller = listing && listing.seller.toString() === req.user.id;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ 
        error: 'You do not have permission to view this order' 
      });
    }

    res.json({
      success: true,
      order: order.toJSON()
    });

  } catch (error) {
    console.error('Get Order Error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(500).json({ 
      error: 'Failed to fetch order',
      details: error.message 
    });
  }
});

// @route   PATCH /api/orders/:id/confirm
// @desc    Confirm an order (seller action)
// @access  Private (Sellers only: dining_hall_staff)
router.patch('/:id/confirm', authenticateToken, authorizeRoles('dining_hall_staff'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('listing');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user is the seller
    const listing = await Listing.findById(order.listing);
    if (listing.seller.toString() !== req.user.id) {
      return res.status(403).json({ 
        error: 'You do not have permission to confirm this order' 
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Order is not in pending status' 
      });
    }

    await order.confirm();

    res.json({
      success: true,
      order: order.toJSON(),
      message: 'Order confirmed successfully'
    });

  } catch (error) {
    console.error('Confirm Order Error:', error);
    res.status(500).json({ 
      error: 'Failed to confirm order',
      details: error.message 
    });
  }
});

// @route   PATCH /api/orders/:id/picked-up
// @desc    Mark order as picked up (seller action)
// @access  Private (Sellers only: dining_hall_staff)
router.patch('/:id/picked-up', authenticateToken, authorizeRoles('dining_hall_staff'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('listing');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user is the seller
    const listing = await Listing.findById(order.listing);
    if (listing.seller.toString() !== req.user.id) {
      return res.status(403).json({ 
        error: 'You do not have permission to mark this order as picked up' 
      });
    }

    if (order.status !== 'confirmed') {
      return res.status(400).json({ 
        error: 'Order must be confirmed before marking as picked up' 
      });
    }

    await order.markPickedUp();

    res.json({
      success: true,
      order: order.toJSON(),
      message: 'Order marked as picked up successfully'
    });

  } catch (error) {
    console.error('Mark Picked Up Error:', error);
    res.status(500).json({ 
      error: 'Failed to mark order as picked up',
      details: error.message 
    });
  }
});

// @route   PATCH /api/orders/:id/cancel
// @desc    Cancel an order
// @access  Private
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const order = await Order.findById(req.params.id)
      .populate('listing');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user has permission to cancel
    const listing = await Listing.findById(order.listing);
    const isBuyer = order.buyer.toString() === req.user.id;
    const isSeller = listing && listing.seller.toString() === req.user.id;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ 
        error: 'You do not have permission to cancel this order' 
      });
    }

    if (!order.canCancel()) {
      return res.status(400).json({ 
        error: 'Order cannot be cancelled' 
      });
    }

    const cancelledBy = isBuyer ? 'buyer' : 'seller';
    await order.cancel(cancelledBy, reason || 'Cancelled by user');

    res.json({
      success: true,
      order: order.toJSON(),
      message: 'Order cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel Order Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to cancel order',
      details: error.message 
    });
  }
});

export default router;
