const router = require('express').Router();
const { exportBackup, importBackup } = require('../controllers/backupController');
const { protect, authorize } = require('../middleware/auth');

router.get('/export', protect, authorize('admin'), exportBackup);
router.post('/import', protect, authorize('admin'), importBackup);

module.exports = router;
