require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const startCron = require('./utils/overdueJob');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const publicInvoiceRoutes = require('./routes/publicInvoices');
const invoiceRoutes = require('./routes/invoices');
const customerRoutes = require('./routes/customers');
const supplierRoutes = require('./routes/suppliers');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const purchaseRoutes = require('./routes/purchases');
const expenseRoutes = require('./routes/expenses');
const paymentRoutes = require('./routes/payments');
const reportRoutes = require('./routes/reports');
const staffRoutes = require('./routes/staff');
const settingsRoutes = require('./routes/settings');
const reminderRoutes = require('./routes/reminders');
const backupRoutes = require('./routes/backup');

const required = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('FATAL: Missing required environment variables:', missing.join(', '));
}

const app = express();
connectDB().then(() => startCron()).catch(err => {
  console.error('DB connection failed:', err.message);
});

app.use(helmet());
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.set('trust proxy', 1);
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Public routes — no auth required
app.use('/api/public/invoices', publicInvoiceRoutes);

// Protected routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/backup', backupRoutes);

app.use(errorHandler);

app.get('/', (req, res) => res.json({ status: 'ok' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
