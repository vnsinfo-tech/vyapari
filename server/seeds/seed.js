require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Business = require('../models/Business');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Purchase = require('../models/Purchase');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://swet:swet1234@vyapari.sxhwfrw.mongodb.net/vyapari';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([User, Business, Customer, Supplier, Category, Product, Invoice, Expense, Purchase].map(M => M.deleteMany({})));

  // Create user
  const user = await User.create({ name: 'Ramesh Kumar', email: 'demo@vyapari.com', password: 'demo1234', role: 'admin' });

  // Create business
  const business = await Business.create({
    owner: user._id, name: 'Ramesh General Store', type: 'retailer',
    gstin: '27AAPFU0939F1ZV', pan: 'AAPFU0939F', phone: '9876543210',
    email: 'ramesh@store.com',
    address: { line1: '12, MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    invoicePrefix: 'INV', invoiceCounter: 8,
  });
  user.business = business._id;
  await user.save();

  // Categories
  const [electronics, grocery, clothing] = await Category.insertMany([
    { business: business._id, name: 'Electronics' },
    { business: business._id, name: 'Grocery' },
    { business: business._id, name: 'Clothing' },
  ]);

  // Products
  const products = await Product.insertMany([
    { business: business._id, name: 'Samsung TV 32"', sku: 'TV001', category: electronics._id, salePrice: 18000, purchasePrice: 14000, gstRate: 18, hsnCode: '8528', stock: 10, lowStockAlert: 2, unit: 'pcs' },
    { business: business._id, name: 'Basmati Rice 5kg', sku: 'GR001', category: grocery._id, salePrice: 350, purchasePrice: 280, gstRate: 5, hsnCode: '1006', stock: 3, lowStockAlert: 5, unit: 'bag' },
    { business: business._id, name: 'Cotton Shirt', sku: 'CL001', category: clothing._id, salePrice: 599, purchasePrice: 350, gstRate: 12, hsnCode: '6205', stock: 25, lowStockAlert: 5, unit: 'pcs' },
    { business: business._id, name: 'Bluetooth Speaker', sku: 'EL002', category: electronics._id, salePrice: 2500, purchasePrice: 1800, gstRate: 18, hsnCode: '8518', stock: 8, lowStockAlert: 3, unit: 'pcs' },
    { business: business._id, name: 'Wheat Flour 10kg', sku: 'GR002', category: grocery._id, salePrice: 420, purchasePrice: 320, gstRate: 0, hsnCode: '1101', stock: 2, lowStockAlert: 10, unit: 'bag' },
  ]);

  // Customers
  const customers = await Customer.insertMany([
    { business: business._id, name: 'Suresh Patel', phone: '9812345678', email: 'suresh@email.com', gstin: '27BBBBB1234C1Z5', address: { city: 'Mumbai', state: 'Maharashtra' } },
    { business: business._id, name: 'Priya Sharma', phone: '9823456789', email: 'priya@email.com', address: { city: 'Pune', state: 'Maharashtra' } },
    { business: business._id, name: 'Amit Electronics', phone: '9834567890', gstin: '27CCCCC5678D1Z3', address: { city: 'Nashik', state: 'Maharashtra' } },
  ]);

  // Suppliers
  await Supplier.insertMany([
    { business: business._id, name: 'Samsung India Pvt Ltd', phone: '1800110011', gstin: '07AAAAA1234B1Z5', address: { city: 'Delhi', state: 'Delhi' } },
    { business: business._id, name: 'Agro Foods Wholesale', phone: '9900112233', address: { city: 'Nagpur', state: 'Maharashtra' } },
  ]);

  // Invoices
  const months = [0, 1, 2, 3, 4, 5, 6];
  for (let i = 0; i < 7; i++) {
    const date = new Date(2025, months[i], 10);
    await Invoice.create({
      business: business._id, invoiceNumber: `INV-000${i + 1}`,
      customer: customers[i % 3]._id, customerName: customers[i % 3].name,
      invoiceDate: date, dueDate: new Date(date.getTime() + 15 * 86400000),
      items: [{ product: products[i % 5]._id, name: products[i % 5].name, quantity: 2, rate: products[i % 5].salePrice, gstRate: products[i % 5].gstRate, cgst: (products[i % 5].salePrice * 2 * products[i % 5].gstRate) / 200, sgst: (products[i % 5].salePrice * 2 * products[i % 5].gstRate) / 200, igst: 0, amount: products[i % 5].salePrice * 2 * (1 + products[i % 5].gstRate / 100) }],
      subtotal: products[i % 5].salePrice * 2,
      totalCgst: (products[i % 5].salePrice * 2 * products[i % 5].gstRate) / 200,
      totalSgst: (products[i % 5].salePrice * 2 * products[i % 5].gstRate) / 200,
      totalTax: (products[i % 5].salePrice * 2 * products[i % 5].gstRate) / 100,
      grandTotal: products[i % 5].salePrice * 2 * (1 + products[i % 5].gstRate / 100),
      paidAmount: i < 5 ? products[i % 5].salePrice * 2 * (1 + products[i % 5].gstRate / 100) : 0,
      dueAmount: i < 5 ? 0 : products[i % 5].salePrice * 2 * (1 + products[i % 5].gstRate / 100),
      status: i < 5 ? 'paid' : 'sent', paymentMode: 'upi',
    });
  }

  // Expenses
  await Expense.insertMany([
    { business: business._id, category: 'Rent', amount: 15000, date: new Date(2025, 5, 1), paymentMode: 'bank', description: 'Monthly shop rent' },
    { business: business._id, category: 'Electricity', amount: 3200, date: new Date(2025, 5, 5), paymentMode: 'upi' },
    { business: business._id, category: 'Salary', amount: 12000, date: new Date(2025, 5, 1), paymentMode: 'bank' },
    { business: business._id, category: 'Transport', amount: 1500, date: new Date(2025, 5, 10), paymentMode: 'cash' },
    { business: business._id, category: 'Marketing', amount: 5000, date: new Date(2025, 4, 15), paymentMode: 'upi' },
  ]);

  console.log('✅ Seed data inserted successfully');
  console.log('📧 Login: demo@vyapari.com | Password: demo1234');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
