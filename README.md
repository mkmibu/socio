# 🚀 SociaBoost - Platform Social Media Exchange

**Platform Social Media Exchange #1 di Indonesia**

SociaBoost adalah platform terpercaya untuk meningkatkan engagement media sosial dengan sistem poin yang fleksibel dan transparan.

## ✨ Fitur Utama

### Untuk Member
- 📊 **Dashboard** - Ringkasan aktivitas real-time
- 💎 **Top-Up Poin** - Beli poin dengan berbagai paket
- 📢 **Buat Kampanye** - Tingkatkan engagement dengan kampanye custom
- 🎯 **Ambil Task** - Dapatkan poin dengan menyelesaikan task
- 👥 **Koneksi Sosial** - Link akun Instagram, TikTok, YouTube, Facebook, Twitter/X
- 💳 **Payment Gateway** - QRIS, GoPay, OVO, Bank Transfer, Kartu Kredit (via Midtrans)
- 📋 **Riwayat Transaksi** - Track semua aktivitas poin

### Tier System
- **FREE** - 10 bonus poin, maks 3 kampanye aktif, earning cap 500 poin/hari
- **PRO** ⭐ - 50 bonus poin, maks 20 kampanye aktif, earning cap 5000 poin/hari, priority queue

### Untuk Admin
- 👥 **Kelola Member** - Suspend/activate, ubah tier, monitoring
- 📣 **Kelola Kampanye** - Review, pause, delete campaigns
- 🔍 **Verifikasi Manual** - Approve/reject task yang mencurigakan
- 📜 **Log Transaksi** - Audit trail lengkap
- 🛠️ **Pengaturan** - Tier limits, paket top-up, sistem

## 🏗️ Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + bcryptjs
- **Payment**: Midtrans API
- **Security**: Helmet, CORS, input validation
- **Logging**: Morgan
- **Testing**: Jest + Supertest

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- MongoDB 4.4+
- npm atau yarn

### Installation

```bash
# Clone repository
git clone https://github.com/mkmibu/socio.git
cd socio

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dengan konfigurasi Anda

# Start development server
npm run dev
```

Server akan berjalan di `http://localhost:5000`

## 📚 API Documentation

### Authentication

```bash
# Register
POST /api/auth/register
{
  "username": "demo",
  "email": "demo@example.com",
  "name": "Demo User",
  "password": "password123",
  "tier": "free"
}

# Login
POST /api/auth/login
{
  "username": "demo",
  "password": "password123"
}

Response: { token, user }
```

### Campaigns

```bash
# Get my campaigns
GET /api/campaigns
Header: Authorization: Bearer <token>

# Create campaign
POST /api/campaigns
{
  "platform": "Instagram",
  "action": "Like",
  "url": "https://instagram.com/p/xxxxx",
  "ppa": 5,
  "total": 100
}

# Get available tasks
GET /api/tasks

# Take task
POST /api/tasks/:campaignId/take
```

### Top-Up

```bash
# Get packages
GET /api/topup/packages

# Create payment
POST /api/topup/payment
{
  "packageId": "pkg_1",
  "paymentMethod": "qris"
}

Response: { snapToken, redirectUrl }
```

### Admin

```bash
# Dashboard stats
GET /api/admin/dashboard
Header: Authorization: Bearer <admin_token>

# List members
GET /api/admin/members?tier=free&search=username

# Manage tier
PATCH /api/admin/members/:userId/tier
{
  "tier": "pro"
}

# Verify manual review
POST /api/admin/reviews/:reviewId/approve
POST /api/admin/reviews/:reviewId/reject
```

## 🗄️ Database Schema

### Users
```javascript
{
  username: String (unique),
  email: String (unique),
  name: String,
  password: String (hashed),
  tier: 'free' | 'pro' | 'admin',
  points: Number,
  totalEarned: Number,
  totalSpent: Number,
  status: 'active' | 'suspended',
  connections: [
    { platform: String, username: String }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Campaigns
```javascript
{
  owner: ObjectId (ref: User),
  platform: String,
  action: String,
  url: String,
  ppa: Number (points per action),
  total: Number (target engagement),
  remaining: Number,
  status: 'active' | 'paused' | 'completed' | 'expired',
  createdAt: Date,
  updatedAt: Date
}
```

### Transactions
```javascript
{
  user: ObjectId (ref: User),
  type: 'earn' | 'spend' | 'topup' | 'bonus' | 'refund',
  amount: Number,
  balanceAfter: Number,
  description: String,
  relatedId: ObjectId,
  createdAt: Date
}
```

### Tasks
```javascript
{
  campaign: ObjectId (ref: Campaign),
  worker: ObjectId (ref: User),
  status: 'pending' | 'verified' | 'needs_manual_review' | 'failed',
  reward: Number,
  note: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔐 Security Features

- ✅ Password hashing dengan bcryptjs
- ✅ JWT token authentication
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation & sanitization
- ✅ Rate limiting (ready to implement)
- ✅ SQL injection prevention (MongoDB native)
- ✅ XSS protection

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.js

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

## 📦 Deployment

### Heroku

```bash
heroku create your-app-name
heroku addons:create mongolab:sandbox
heroku config:set JWT_SECRET="your_secret_key"
heroku config:set MIDTRANS_SERVER_KEY="your_key"
git push heroku main
```

### Docker

```bash
docker build -t sociaboost .
docker run -p 5000:5000 --env-file .env sociaboost
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Update `JWT_SECRET` dengan key yang kuat
- [ ] Configure MongoDB dengan authentication
- [ ] Setup Midtrans dengan production credentials
- [ ] Enable SSL/HTTPS
- [ ] Setup monitoring & logging
- [ ] Configure firewall & rate limiting
- [ ] Setup CI/CD pipeline
- [ ] Regular database backups

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Pastikan MongoDB service running
mongod

# Verify connection
echo "test" | mongo
```

### Port Already in Use
```bash
# Change PORT di .env atau:
PORT=3001 npm run dev
```

### Payment Gateway Error
```bash
# Verify Midtrans credentials di .env
# Test dengan sandbox mode dulu
MIDTRANS_ENVIRONMENT=sandbox
```

## 📝 Demo Accounts

| Username | Email | Password | Tier |
|----------|-------|----------|------|
| demo | demo@sociaboost.id | demo123 | Free |
| pro | pro@sociaboost.id | pro123 | Pro |
| creator | creator@sociaboost.id | creator123 | Free |
| admin | admin@sociaboost.id | admin123 | Admin |

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

MIT License - lihat [LICENSE](LICENSE) file

## 📞 Support

- 🌐 Website: https://sociaboost.id
- 💬 Discord: [Join Server](#)
- 📧 Email: support@sociaboost.id
- 🐛 Issues: https://github.com/mkmibu/socio/issues

---

**Made with ❤️ by mkmibu**
