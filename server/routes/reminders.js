const router = require('express').Router();
const { getReminders, sendReminder } = require('../controllers/reminderController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getReminders);
router.post('/send', sendReminder);

module.exports = router;
