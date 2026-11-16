// API FRAMEWORK
const express = require('express');
// CROSS ORIGIN RESOURCE SHARING
const cors = require('cors');
// ENVIRONMENT VARIABLES
require('dotenv').config();
// DATABASE CONNECTION
const db = require('./config/db');
// NEW: Admin routes (separate router, protected by a signed admin token)
const adminRoutes = require('./routes/adminRoutes');
// ROUTES
const routes = require('./routes/index.js');
// UTILIZATION OF EXPRESS
const app = express();

// NEW: Render puts one proxy in front of this app. Without this line every
// visitor looks like the same IP address, so the login rate limit
// (middleware/rateLimit.js) would count everyone's failed logins together and
// could lock the whole site out. With it, each visitor is limited separatelywoah.
app.set('trust proxy', 1);

// MIDDLEWARES
app.use(cors());

// UPDATED: request size limits are now set PER ROUTE instead of 50mb for everything.
// A 50mb limit on every route meant anyone could send huge bodies to login/signup
// (which need no token) and slow down or crash the free server.
//
// Express only parses a body once, so the bigger limits below must come BEFORE
// the small default limit.
//   - /update-profile : landlord verification documents (4 compressed photos)
//   - add/update listing : photos now go to Cloudinary, so only short links arrive here
app.use('/api/update-profile', express.json({ limit: '12mb' }));
app.use(['/api/add-listing', '/api/update-listing'], express.json({ limit: '1mb' }));

// Everything else (login, signup, reviews, messages, search, admin...) is small.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ limit: '100kb', extended: true }));


// USE ROUTES
// API_BASE ("https://stayfind-app-system.onrender.com/api/admin") depends on.
app.use('/api/admin', adminRoutes);
app.use('/api', routes);

// NEW: friendly answers for oversized or broken request bodies
// (instead of a generic "Something went wrong!").
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ success: false, message: 'That upload is too large. Please use smaller photos.' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid request.' });
  }
  next(err);
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// PORT SETTING
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
