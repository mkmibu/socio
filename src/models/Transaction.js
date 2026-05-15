const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['earn', 'spend', 'topup', 'bonus', 'refund', 'transfer_out', 'transfer_in'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedModel',
    },
    relatedModel: {
      type: String,
      enum: ['Campaign', 'Task', 'Payment', 'User'],
      sparse: true,
    },
    details: mongoose.Schema.Types.Mixed,
    paymentMethod: {
      type: String,
      enum: ['qris', 'gopay', 'ovo', 'bca', 'bni', 'mandiri', 'bri', 'cc', 'manual'],
      sparse: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'completed',
    },
    reference: {
      type: String,
      unique: true,
      sparse: true,
    },
    notes: String,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

transactionSchema.index({ user: 1 });
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ reference: 1 }, { sparse: true });

// ============================================
// VIRTUALS
// ============================================

transactionSchema.virtual('formattedAmount').get(function () {
  return (this.amount > 0 ? '+' : '') + this.amount.toLocaleString('id-ID');
});

transactionSchema.virtual('typeLabel').get(function () {
  const labels = {
    earn: 'Diperoleh',
    spend: 'Digunakan',
    topup: 'Top-Up',
    bonus: 'Bonus',
    refund: 'Pengembalian',
    transfer_out: 'Transfer Keluar',
    transfer_in: 'Transfer Masuk',
  };
  return labels[this.type] || this.type;
});

// ============================================
// STATICS
// ============================================

// Get user transaction summary
transactionSchema.statics.getSummary = async function (userId) {
  const result = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    earn: 0,
    spend: 0,
    topup: 0,
    bonus: 0,
    refund: 0,
  };

  result.forEach((item) => {
    if (summary.hasOwnProperty(item._id)) {
      summary[item._id] = {
        amount: item.total,
        count: item.count,
      };
    }
  });

  return summary;
};

// Get daily summary
transactionSchema.statics.getDailySummary = async function (userId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        earn: {
          $sum: { $cond: [{ $eq: ['$type', 'earn'] }, '$amount', 0] },
        },
        spend: {
          $sum: { $cond: [{ $eq: ['$type', 'spend'] }, '$amount', 0] },
        },
        topup: {
          $sum: { $cond: [{ $eq: ['$type', 'topup'] }, '$amount', 0] },
        },
        bonus: {
          $sum: { $cond: [{ $eq: ['$type', 'bonus'] }, '$amount', 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);
