const router = require('express').Router();
const { getSettings, updateSettings, uploadLogo, upload } = require('../controllers/settingsController');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect);
router.get('/', getSettings);
router.put('/', checkPermission('settings'), updateSettings);
router.post('/logo', checkPermission('settings'), upload.single('logo'), uploadLogo);

module.exports = router;
