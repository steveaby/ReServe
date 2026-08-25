import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  // Seller information
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Basic information
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  // Quantity and pricing
  availableUnits: {
    type: Number,
    required: true,
    min: 0
  },
  unitLabel: {
    type: String,
    required: true,
    enum: ['meals', 'lbs', 'trays', 'slices', 'boxes'],
    default: 'meals'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Pickup information
  location: {
    type: String,
    required: true,
    trim: true
  },
  pickupWindowStart: {
    type: Date,
    required: true
  },
  pickupWindowEnd: {
    type: Date,
    required: true
  },
  
  // Seller type and details
  sellerType: {
    type: String,
    required: true,
    enum: ['Dining Hall', 'Restaurant', 'RSO', 'Student/Private']
  },
  diningHall: {
    type: String,
    trim: true
  },
  restaurantName: {
    type: String,
    trim: true
  },
  rsoName: {
    type: String,
    trim: true
  },
  
  // Contact information
  contactName: {
    type: String,
    required: true,
    trim: true
  },
  contactEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    required: true,
    trim: true
  },
  
  // Dietary and allergen information
  dietaryTags: {
    type: [String],
    default: []
  },
  dietaryOther: {
    type: String,
    trim: true
  },
  allergens: {
    type: [String],
    default: []
  },
  allergenOtherDetails: {
    type: String,
    trim: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'sold_out', 'expired', 'cancelled'],
    default: 'active'
  },
  
  // Additional optional fields that might be useful
  image: {
    type: String
  },
  fullDescription: {
    type: String,
    trim: true
  },
  ingredients: {
    type: String,
    trim: true
  },
  nutrition: {
    calories: Number,
    protein: String,
    carbs: String,
    fat: String
  },
  pickupInstructions: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
listingSchema.index({ status: 1, pickupWindowEnd: 1 });
listingSchema.index({ seller: 1 });
listingSchema.index({ createdAt: -1 });

// Virtual to calculate remaining time in minutes
listingSchema.virtual('freshMinutes').get(function() {
  const now = new Date();
  const end = this.pickupWindowEnd;
  if (end < now) return 0;
  return Math.round((end - now) / (1000 * 60));
});

// Method to check if listing is available
listingSchema.methods.isAvailable = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.availableUnits > 0 && 
         this.pickupWindowEnd > now;
};

// Method to update status based on availability
listingSchema.methods.updateStatus = function() {
  const now = new Date();
  if (this.availableUnits <= 0) {
    this.status = 'sold_out';
  } else if (this.pickupWindowEnd < now) {
    this.status = 'expired';
  } else if (this.status === 'sold_out' && this.availableUnits > 0 && this.pickupWindowEnd > now) {
    this.status = 'active';
  }
  return this.status;
};

// Pre-save hook to validate pickup window
listingSchema.pre('save', function(next) {
  if (this.pickupWindowEnd <= this.pickupWindowStart) {
    return next(new Error('Pickup window end must be after start'));
  }
  this.updateStatus();
  next();
});

// Transform output to match frontend expectations
listingSchema.methods.toJSON = function() {
  const listing = this.toObject();
  
  // Format pickup window as time string for frontend
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
    listing.time = `${formatTime(listing.pickupWindowStart)} – ${formatTime(listing.pickupWindowEnd)}`;
  }
  
  // Format dietary tags as comma-separated string
  if (listing.dietaryTags && listing.dietaryTags.length > 0) {
    listing.tags = listing.dietaryTags[0]; // Frontend seems to expect single tag for display
  }
  
  // Format allergens
  if (listing.allergens && listing.allergens.length > 0) {
    listing.allergens = listing.allergens.join(', ');
  }
  
  listing.fresh = this.freshMinutes;
  listing.available = listing.availableUnits;
  listing.hall = listing.location;
  
  return listing;
};

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;
