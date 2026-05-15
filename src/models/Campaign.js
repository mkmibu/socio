const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    platform: {
      type: String,
      enum: ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter/X'],
      required: [true, 'Platform wajib dipilih'],
    },
    action: {
      type: String,
      enum: ['Like', 'Comment', 'Follow', 'Subscribe'],
      required: [true, 'Aksi wajib dipilih'],
    },
    url: {
      type: String,
      required: [true, 'URL target wajib diisi'],
      validate: {
        validator: (v) => /^https?:\/\/.+/.test(v),
        message: 'Format URL tidak valid',
      },
    },
    description: {
      type: String,
      maxlength: [500, 'Deskripsi maksimal 500 karakter'],
    },
    ppa: {
      type: Number,
      required: [true, 'Poin per aksi wajib diisi'],
      min: [1, 'Poin per aksi minimal 1'],
      max: [100, 'Poin per aksi maksimal 100'],
    },
    total: {
      type: Number,
      required: [true, 'Target engagement wajib diisi'],
      min: [1, 'Target engagement minimal 1'],
      max: [10000, 'Target engagement maksimal 10000'],
    },
    remaining: {
      type: Number,
      required: true,
    },
    verified: {
      type: Number,
      default: 0,
    },
    failed: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'expired', 'suspended'],
      default: 'active',
    },
    statusReason: String,
    priority: {
      type: String,
      enum: ['normal', 'high'],
      default: 'normal',
    },
    budget: {
      type: Number,
      required: true,
    },
    spent: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      validate: {
        validator: (v) => !v || v > Date.now(),
        message: 'Waktu kadaluarsa harus di masa depan',
      },
    },
    rejectionReasons: [{
      taskId: mongoose.Schema.Types.ObjectId,
      reason: String,
      rejectedAt: Date,
    }],
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

campaignSchema.index({ owner: 1 });
campaignSchema.index({ platform: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ 'owner': 1, 'status': 1 });
campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ expiresAt: 1 }, { sparse: true });

// ============================================
// VIRTUALS
// ============================================

campaignSchema.virtual('progress').get(function () {
  return Math.round(((this.total - this.remaining) / this.total) * 100);
});

campaignSchema.virtual('totalCost').get(function () {
  return this.ppa * this.total;
});

campaignSchema.virtual('remainingBudget').get(function () {
  return this.ppa * this.remaining;
});

campaignSchema.virtual('isExpired').get(function () {
  return this.expiresAt && this.expiresAt < Date.now();
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

campaignSchema.pre('save', function (next) {
  // Set remaining = total jika baru dibuat
  if (this.isNew && !this.remaining) {
    this.remaining = this.total;
  }

  // Set budget
  if (!this.budget) {
    this.budget = this.ppa * this.total;
  }

  // Auto-complete jika remaining = 0
  if (this.remaining <= 0 && this.status === 'active') {
    this.status = 'completed';
  }

  // Auto-expire
  if (this.isExpired && this.status === 'active') {
    this.status = 'expired';
    this.statusReason = 'Campaign kadaluarsa';
  }

  next();
});

// ============================================
// METHODS
// ============================================

// Reduce remaining engagement
campaignSchema.methods.reduceRemaining = async function (count = 1) {
  this.remaining = Math.max(0, this.remaining - count);
  this.verified += count;

  if (this.remaining === 0) {
    this.status = 'completed';
  }

  return this.save();
};

// Check if campaign is still active
campaignSchema.methods.isActive = function () {
  return (
    this.status === 'active' &&
    this.remaining > 0 &&
    (!this.expiresAt || this.expiresAt > Date.now())
  );
};

// Pause campaign
campaignSchema.methods.pause = async function () {
  this.status = 'paused';
  return this.save();
};

// Resume campaign
campaignSchema.methods.resume = async function () {
  if (this.isExpired) {
    throw new Error('Tidak bisa resume kampanye yang sudah kadaluarsa');
  }
  this.status = 'active';
  return this.save();
};

// Add rejection reason
campaignSchema.methods.addRejection = async function (taskId, reason) {
  this.rejectionReasons.push({
    taskId,
    reason,
    rejectedAt: new Date(),
  });
  this.failed += 1;
  return this.save();
};

module.exports = mongoose.model('Campaign', campaignSchema);
