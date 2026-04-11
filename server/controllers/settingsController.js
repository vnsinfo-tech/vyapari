const Business = require('../models/Business');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/logos';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${req.user.business._id}${path.extname(file.originalname)}`),
});
exports.upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images allowed'));
}});

exports.getSettings = async (req, res, next) => {
  try {
    const business = await Business.findById(req.user.business._id);
    res.json(business);
  } catch (err) { next(err); }
};

exports.updateSettings = async (req, res, next) => {
  try {
    // Prevent overwriting protected fields
    const { owner: _o, plan: _p, invoiceCounter: _c, ...updateData } = req.body;
    const business = await Business.findByIdAndUpdate(req.user.business._id, updateData, { new: true, runValidators: true });
    res.json(business);
  } catch (err) { next(err); }
};

exports.uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    await Business.findByIdAndUpdate(req.user.business._id, { logo: logoUrl });
    res.json({ logo: logoUrl });
  } catch (err) { next(err); }
};
