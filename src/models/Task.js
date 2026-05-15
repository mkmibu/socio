const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    platform: {
      type: String,
      enum: ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter/X'],
      required: true,
    },
    action: {
      type: String,
      enum: ['Like', 'Comment', 'Follow', 'Subscribe'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    reward: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'needs_manual_review', 'failed', 'cancelled'],
      default: 'pending',
    },
    verificationMethod: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },
    verificationProof: {
      screenshot: String,
      notes: String,
      submittedAt: Date,
    },
    failureReason: String,
    reviewNote: String,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    reviewedAt: Date,
    completedAt: Date,
    workerProfile: {
      accountAge: Number, // days
      followerCount: Number,
      isVerified: Boolean,
      suspiciousFlags: [String],
    },
    autoFailReasons: [String],
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

taskSchema.index({ campaign: 1 });
taskSchema.index({ worker: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ campaign: 1, worker: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ completedAt: 1 }, { sparse: true });

// ============================================
// VIRTUALS
// ============================================

taskSchema.virtual('isDue').get(function () {
  const createdTime = this.createdAt.getTime();
  const now = Date.now();
  const dueTime = 48 * 60 * 60 * 1000; // 48 hours
  return now - createdTime > dueTime && this.status === 'pending';
});

taskSchema.virtual('statusLabel').get(function () {
  const labels = {
    pending: 'Menunggu Verifikasi',
    verified: 'Terverifikasi',
    needs_manual_review: 'Perlu Review Manual',
    failed: 'Ditolak',
    cancelled: 'Dibatalkan',
  };
  return labels[this.status] || this.status;
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

taskSchema.pre('save', function (next) {
  // Set completed time when status changes to verified or failed
  if (this.isModified('status')) {
    if (this.status === 'verified' || this.status === 'failed') {
      this.completedAt = new Date();
    }
  }

  next();
});

// ============================================
// METHODS
// ============================================

// Verify task
taskSchema.methods.verify = async function (reviewedBy = null) {
  this.status = 'verified';
  this.completedAt = new Date();
  if (reviewedBy) {
    this.reviewedBy = reviewedBy;
    this.reviewedAt = new Date();
    this.verificationMethod = 'manual';
  }
  return this.save();
};

// Reject task
taskSchema.methods.reject = async function (reason, reviewedBy = null) {
  this.status = 'failed';
  this.failureReason = reason;
  this.completedAt = new Date();
  if (reviewedBy) {
    this.reviewedBy = reviewedBy;
    this.reviewedAt = new Date();
  }
  return this.save();
};

// Request manual review
taskSchema.methods.requestManualReview = async function (note = '') {
  this.status = 'needs_manual_review';
  this.reviewNote = note;
  return this.save();
};

// Check if task is suspicious (anti-fraud)
taskSchema.methods.checkSuspicious = function () {
  const flags = [];

  if (this.workerProfile) {
    // New account
    if (this.workerProfile.accountAge < 7) {
      flags.push('Akun baru (kurang dari 7 hari)');
    }

    // Low followers
    if (this.workerProfile.followerCount < 50) {
      flags.push('Jumlah follower terlalu rendah');
    }

    // Not verified
    if (!this.workerProfile.isVerified) {
      flags.push('Akun belum terverifikasi');
    }
  }

  return flags;
};

// Auto-verify task based on rules
taskSchema.methods.autoVerify = async function () {
  const suspiciousFlags = this.checkSuspicious();

  if (suspiciousFlags.length === 0) {
    // Auto verify if no suspicious flags
    await this.verify();
    return { verified: true, reason: 'Otomatis terverifikasi' };
  } else {
    // Need manual review
    this.autoFailReasons = suspiciousFlags;
    await this.requestManualReview(
      'Aktivitas mencurigakan: ' + suspiciousFlags.join(', ')
    );
    return { verified: false, reason: suspiciousFlags.join(', ') };
  }
};

module.exports = mongoose.model('Task', taskSchema);
