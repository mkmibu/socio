const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username wajib diisi'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username minimal 3 karakter'],
      maxlength: [20, 'Username maksimal 20 karakter'],
      match: [/^[a-z0-9_]+$/, 'Username hanya boleh mengandung huruf kecil, angka, dan underscore'],
    },
    email: {
      type: String,
      required: [true, 'Email wajib diisi'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Format email tidak valid'],
    },
    name: {
      type: String,
      required: [true, 'Nama wajib diisi'],
      trim: true,
      minlength: [2, 'Nama minimal 2 karakter'],
      maxlength: [50, 'Nama maksimal 50 karakter'],
    },
    password: {
      type: String,
      required: [true, 'Password wajib diisi'],
      minlength: [6, 'Password minimal 6 karakter'],
      select: false, // Jangan return password saat query
    },
    tier: {
      type: String,
      enum: ['free', 'pro', 'admin'],
      default: 'free',
    },
    points: {
      type: Number,
      default: 0,
      min: [0, 'Poin tidak boleh negatif'],
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
    },
    connections: [
      {
        platform: {
          type: String,
          enum: ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter/X'],
        },
        username: String,
        verified: {
          type: Boolean,
          default: false,
        },
        connectedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    dailyEarnings: {
      type: Number,
      default: 0,
    },
    lastEarningReset: {
      type: Date,
      default: Date.now,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpire: Date,
    passwordResetToken: String,
    passwordResetExpire: Date,
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES
// ============================================

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ tier: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================

userSchema.virtual('isAccountLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Hash password sebelum save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Reset daily earnings jika sudah 24 jam
userSchema.pre('save', function (next) {
  const now = new Date();
  const lastReset = new Date(this.lastEarningReset);
  const diff = now - lastReset;
  const hours = diff / (1000 * 60 * 60);

  if (hours >= 24) {
    this.dailyEarnings = 0;
    this.lastEarningReset = now;
  }

  next();
});

// ============================================
// METHODS
// ============================================

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if daily earning cap exceeded
userSchema.methods.canEarn = function (amount) {
  const tierLimits = {
    free: 500,
    pro: 5000,
    admin: Infinity,
  };
  const limit = tierLimits[this.tier] || 500;
  return this.dailyEarnings + amount <= limit;
};

// Add points
userSchema.methods.addPoints = function (amount, reason = '') {
  this.points += amount;
  this.totalEarned += amount;
  this.dailyEarnings += amount;
  return this.save();
};

// Deduct points
userSchema.methods.deductPoints = function (amount, reason = '') {
  if (this.points < amount) {
    throw new Error('Saldo poin tidak mencukupi');
  }
  this.points -= amount;
  this.totalSpent += amount;
  return this.save();
};

// Get safe user object (without sensitive data)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  delete obj.passwordResetToken;
  delete obj.__v;
  return obj;
};

// ============================================
// STATICS
// ============================================

// Find by username or email
userSchema.statics.findByCredential = async function (usernameOrEmail, password) {
  const user = await this.findOne({
    $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
  }).select('+password');

  if (!user) {
    throw new Error('Username/email atau password salah');
  }

  if (user.isAccountLocked) {
    throw new Error('Akun terkunci. Coba lagi nanti.');
  }

  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
    }
    await user.save();
    throw new Error('Username/email atau password salah');
  }

  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  await user.save();

  return user;
};

module.exports = mongoose.model('User', userSchema);
