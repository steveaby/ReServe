import express from 'express';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/listings
// @desc    Create a new listing (sell food)
// @access  Private (Sellers only: dining_hall_staff)
router.post('/', authenticateToken, authorizeRoles('dining_hall_staff'), async (req, res) => {
  try {
    const {
      title,
      desc,
      units,
      unitLabel,
      price,
      location,
      winFrom,
      winTo,
      stype,
      dhall,
      rname,
      rsoname,
      cname,
      cemail,
      cphone,
      dietaryTags,
      allergens,
      dietOther,
      allerOther,
      image,
      fullDescription,
      ingredients,
      nutrition,
      pickupInstructions
    } = req.body;

    // Validation
    if (!title || !desc || !units || !price || !location || !winFrom || !winTo || !stype || !cname || !cemail || !cphone) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Validate seller type specific fields
    if (stype === 'Dining Hall' && !dhall) {
      return res.status(400).json({
        error: 'Dining hall is required for Dining Hall seller type'
      });
    }
    if (stype === 'Restaurant' && !rname) {
      return res.status(400).json({
        error: 'Restaurant name is required for Restaurant seller type'
      });
    }
    if (stype === 'RSO' && !rsoname) {
      return res.status(400).json({
        error: 'RSO name is required for RSO seller type'
      });
    }

    // Validate pickup window
    // datetime-local inputs send "YYYY-MM-DDTHH:mm" format (local time, no timezone)
    // We need to parse it as local time explicitly to avoid timezone conversion issues
    const parseLocalDateTime = (dateTimeString) => {
      // If the string is in "YYYY-MM-DDTHH:mm" format (no timezone), treat it as local time
      if (dateTimeString && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTimeString)) {
        // Parse as local time by creating date components
        const [datePart, timePart] = dateTimeString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        // Create date in local timezone (this is what the user selected)
        return new Date(year, month - 1, day, hours, minutes);
      }
      // Fallback to standard Date parsing
      return new Date(dateTimeString);
    };
    
    const pickupStart = parseLocalDateTime(winFrom);
    const pickupEnd = parseLocalDateTime(winTo);
    const now = new Date();
    
    // Validate that pickup start time is not in the past
    if (pickupStart < now) {
      return res.status(400).json({
        error: 'Pickup window start time cannot be in the past'
      });
    }
    
    // Validate that pickup end time is after start time
    if (pickupEnd <= pickupStart) {
      return res.status(400).json({
        error: 'Pickup window end must be after start'
      });
    }

    // Validate units and price
    const availableUnits = parseInt(units);
    const unitPrice = parseFloat(price);
    if (isNaN(availableUnits) || availableUnits <= 0) {
      return res.status(400).json({
        error: 'Available units must be a positive integer'
      });
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      return res.status(400).json({
        error: 'Price must be a valid non-negative number'
      });
    }

    // Get user information
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Process dietary tags - handle "Other" case
    let processedDietaryTags = dietaryTags || [];
    if (Array.isArray(dietaryTags)) {
      processedDietaryTags = dietaryTags;
    } else if (typeof dietaryTags === 'string') {
      processedDietaryTags = [dietaryTags];
    }

    // Process allergens - handle "Other" case
    let processedAllergens = allergens || [];
    if (Array.isArray(allergens)) {
      processedAllergens = allergens;
    } else if (typeof allergens === 'string') {
      processedAllergens = [allergens];
    }

    // Create listing
    const listing = await Listing.create({
      seller: req.user.id,
      title: title.trim(),
      description: desc.trim(),
      availableUnits: availableUnits,
      unitLabel: unitLabel || 'meals',
      price: unitPrice,
      location: location.trim(),
      pickupWindowStart: pickupStart,
      pickupWindowEnd: pickupEnd,
      sellerType: stype,
      diningHall: dhall || null,
      restaurantName: rname || null,
      rsoName: rsoname || null,
      contactName: cname.trim(),
      contactEmail: cemail.trim().toLowerCase(),
      contactPhone: cphone.trim(),
      dietaryTags: processedDietaryTags,
      dietaryOther: dietOther || null,
      allergens: processedAllergens,
      allergenOtherDetails: allerOther || null,
      image: image || null,
      fullDescription: fullDescription || null,
      ingredients: ingredients || null,
      nutrition: nutrition || null,
      pickupInstructions: pickupInstructions || null,
      status: 'active'
    });

    // Populate seller info
    await listing.populate('seller', 'name email picture role');

    res.status(201).json({
      success: true,
      listing: listing.toJSON()
    });

  } catch (error) {
    console.error('Create Listing Error:', error);
    res.status(500).json({
      error: 'Failed to create listing',
      details: error.message
    });
  }
});

// @route   GET /api/listings
// @desc    Get all listings with optional filters (buy page)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      search,
      diet,
      hall,
      maxPrice,
      onlyAvailable,
      sellerType,
      limit = 50,
      skip = 0
    } = req.query;

    // Build query
    const query = { status: 'active' };

    // Filter by availability
    if (onlyAvailable === 'true') {
      query.availableUnits = { $gt: 0 };
    }

    // Filter by seller type
    if (sellerType) {
      query.sellerType = sellerType;
    }

    // Filter by dining hall (match against diningHall field only, not location)
    if (hall && hall !== 'All') {
      // Escape special regex characters and match against diningHall field (case-insensitive)
      const escapedHall = hall.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.diningHall = { 
        $exists: true, 
        $ne: null,
        $regex: escapedHall, 
        $options: 'i' 
      };
    }

    // Filter by max price
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        query.price = { $lte: max };
      }
    }

    // Text search
    let textSearchQuery = null;
    if (search && search.trim()) {
      textSearchQuery = {
        $or: [
          { title: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } },
          { location: { $regex: search.trim(), $options: 'i' } },
          { dietaryTags: { $regex: search.trim(), $options: 'i' } }
        ]
      };
    }

    // Combine queries
    const finalQuery = textSearchQuery
      ? { $and: [query, textSearchQuery] }
      : query;

    // Fetch listings
    let listings = await Listing.find(finalQuery)
      .populate('seller', 'name email picture role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // Filter by dietary tags if specified
    if (diet && diet !== 'All') {
      listings = listings.filter(listing =>
        listing.dietaryTags &&
        listing.dietaryTags.some(tag =>
          tag.toLowerCase().includes(diet.toLowerCase())
        )
      );
    }

    // Filter out expired listings and update status
    const now = new Date();
    listings = listings.filter(listing => {
      // Check if expired
      if (listing.pickupWindowEnd < now) {
        return false;
      }

      // Update status if needed
      if (listing.availableUnits <= 0 && listing.status === 'active') {
        return false; // Don't show sold out items unless specifically requested
      }

      return true;
    });

    // Format listings for frontend
    const formattedListings = listings.map(listing => {
      const formatted = { ...listing };

      // Keep raw pickupWindowStart and pickupWindowEnd dates for frontend formatting
      // No formatting needed here - frontend will handle it

      // Calculate fresh minutes
      if (listing.pickupWindowEnd) {
        const minutes = Math.round((new Date(listing.pickupWindowEnd) - now) / (1000 * 60));
        formatted.fresh = Math.max(0, minutes);
      }

      // Format tags
      formatted.tags = listing.dietaryTags && listing.dietaryTags.length > 0
        ? listing.dietaryTags[0]
        : '';

      // Format allergens
      formatted.allergens = listing.allergens && listing.allergens.length > 0
        ? listing.allergens.join(', ')
        : 'None';

      formatted.available = listing.availableUnits;
      formatted.hall = listing.location;
      formatted.desc = listing.description;
      formatted.fullDesc = listing.fullDescription || listing.description;

      // Ensure id field exists (use _id if id doesn't exist)
      if (!formatted.id && formatted._id) {
        formatted.id = formatted._id.toString();
      }

      return formatted;
    });

    res.json({
      success: true,
      listings: formattedListings,
      count: formattedListings.length
    });

  } catch (error) {
    console.error('Get Listings Error:', error);
    res.status(500).json({
      error: 'Failed to fetch listings',
      details: error.message
    });
  }
});

// @route   GET /api/listings/:id
// @desc    Get a single listing by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', 'name email picture role');

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Format for frontend
    const formatted = listing.toJSON();

    res.json({
      success: true,
      listing: formatted
    });

  } catch (error) {
    console.error('Get Listing Error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.status(500).json({
      error: 'Failed to fetch listing',
      details: error.message
    });
  }
});

// @route   GET /api/listings/seller/my
// @desc    Get current user's listings
// @access  Private
router.get('/seller/my', authenticateToken, async (req, res) => {
  try {
    const listings = await Listing.find({ seller: req.user.id })
      .populate('seller', 'name email picture role')
      .sort({ createdAt: -1 })
      .lean();

    // Format listings
    const formattedListings = listings.map(listing => {
      const formatted = { ...listing };

      if (listing.pickupWindowStart && listing.pickupWindowEnd) {
        const formatTime = (date) => {
          const d = new Date(date);
          const hours = d.getHours();
          const minutes = d.getMinutes();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          const displayMinutes = minutes.toString().padStart(2, '0');
          return `${displayHours}:${displayMinutes} ${ampm}`;
        };
        formatted.time = `${formatTime(listing.pickupWindowStart)} – ${formatTime(listing.pickupWindowEnd)}`;
      }

      formatted.tags = listing.dietaryTags && listing.dietaryTags.length > 0
        ? listing.dietaryTags.join(', ')
        : '';

      formatted.allergens = listing.allergens && listing.allergens.length > 0
        ? listing.allergens.join(', ')
        : 'None';

      formatted.available = listing.availableUnits;
      formatted.hall = listing.location;

      return formatted;
    });

    res.json({
      success: true,
      listings: formattedListings,
      count: formattedListings.length
    });

  } catch (error) {
    console.error('Get My Listings Error:', error);
    res.status(500).json({
      error: 'Failed to fetch your listings',
      details: error.message
    });
  }
});

// @route   PATCH /api/listings/:id
// @desc    Update a listing
// @access  Private (Sellers only: dining_hall_staff)
router.patch('/:id', authenticateToken, authorizeRoles('dining_hall_staff'), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check if user is the seller
    if (listing.seller.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'You do not have permission to update this listing'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'availableUnits', 'price', 'location',
      'pickupWindowStart', 'pickupWindowEnd', 'contactName', 'contactEmail',
      'contactPhone', 'dietaryTags', 'allergens', 'status', 'image',
      'fullDescription', 'ingredients', 'nutrition', 'pickupInstructions'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    await listing.save();
    await listing.populate('seller', 'name email picture role');

    res.json({
      success: true,
      listing: listing.toJSON()
    });

  } catch (error) {
    console.error('Update Listing Error:', error);
    res.status(500).json({
      error: 'Failed to update listing',
      details: error.message
    });
  }
});

// @route   DELETE /api/listings/:id
// @desc    Delete a listing
// @access  Private (Sellers only: dining_hall_staff)
router.delete('/:id', authenticateToken, authorizeRoles('dining_hall_staff'), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check if user is the seller
    if (listing.seller.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'You do not have permission to delete this listing'
      });
    }

    // Cancel instead of delete (preserve data)
    listing.status = 'cancelled';
    await listing.save();

    res.json({
      success: true,
      message: 'Listing cancelled successfully'
    });

  } catch (error) {
    console.error('Delete Listing Error:', error);
    res.status(500).json({
      error: 'Failed to delete listing',
      details: error.message
    });
  }
});

export default router;
