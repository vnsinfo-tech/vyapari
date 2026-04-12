const router = require('express').Router();
const { register, login, logout, refreshToken, getMe, forgotPassword, resetPassword, googleAuth } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.post('/register', [body('email').isEmail(), body('password').isLength({ min: 6 }), body('name').notEmpty()], validate, register);
router.post('/login', [body('email').isEmail(), body('password').notEmpty()], validate, login);
router.post('/google', googleAuth);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

module.exports = router;
