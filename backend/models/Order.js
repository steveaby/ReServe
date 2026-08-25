import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  // Buyer information
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Listing information
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  
  // Order details
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Order status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'picked_up', 'cancelled', 'expired'],
    default: 'pending'
  },
  
  // Contact information for buyer (snapshot at time of order)
  buyerName: {
    type: String,
    required: true,
    trim: true
  },
  buyerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  buyerPhone: {
    type: String,
    trim: true
  },
  
  // Pickup information (snapshot from listing)
  pickupLocation: {
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
  
  // Additional notes
  notes: {
    type: String,
    trim: true
  },
  
  // Timestamps
  confirmedAt: {
    type: Date
  },
  pickedUpAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: String,
    enum: ['buyer', 'seller', 'system']
  },
  cancellationReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ listing: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ pickupWindowEnd: 1 });

// Pre-save hook to calculate total price
orderSchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('unitPrice')) {
    this.totalPrice = this.quantity * this.unitPrice;
  }
  
  // Auto-update status if pickup window has passed
  if (this.status === 'pending' || this.status === 'confirmed') {
    const now = new Date();
    if (this.pickupWindowEnd < now) {
      this.status = 'expired';
      this.cancelledAt = now;
      this.cancelledBy = 'system';
      this.cancellationReason = 'Pickup window expired';
    }
  }
  
  next();
});

// Method to check if order can be cancelled
orderSchema.methods.canCancel = function() {
  const now = new Date();
  return (this.status === 'pending' || this.status === 'confirmed') && 
         this.pickupWindowEnd > now;
};

// Method to cancel order
orderSchema.methods.cancel = async function(cancelledBy, reason) {
  if (!this.canCancel()) {
    throw new Error('Order cannot be cancelled');
  }
  
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = cancelledBy;
  this.cancellationReason = reason;
  
  // Restore quantity to listing (only if listing still exists)
  try {
    const Listing = mongoose.model('Listing');
    await Listing.findByIdAndUpdate(this.listing, {
      $inc: { availableUnits: this.quantity }
    });
  } catch (error) {
    // If listing doesn't exist, continue with cancellation anyway
    console.warn('Could not restore units to listing:', error.message);
  }
  
  return this.save();
};

// Method to confirm order
orderSchema.methods.confirm = function() {
  if (this.status !== 'pending') {
    throw new Error('Order is not in pending status');
  }
  this.status = 'confirmed';
  this.confirmedAt = new Date();
  return this.save();
};

// Method to mark as picked up
orderSchema.methods.markPickedUp = function() {
  if (this.status !== 'confirmed') {
    throw new Error('Order must be confirmed before marking as picked up');
  }
  this.status = 'picked_up';
  this.pickedUpAt = new Date();
  return this.save();
};

// Don't expose internal fields
orderSchema.methods.toJSON = function() {
  const order = this.toObject();
  // Remove internal fields if needed
  return order;
};

const Order = mongoose.model('Order', orderSchema);

export default Order;
