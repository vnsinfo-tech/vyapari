const router = require('express').Router();
const { exportBackup } = require('../controllers/backupController');
const { protect, authorize } = require('../middleware/auth');

router.get('/export', protect, authorize('admin'), exportBackup);

module.exports = router;
