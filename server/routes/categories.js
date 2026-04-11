const router = require('express').Router();
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', async (req, res, next) => {
  try {
    const data = await Category.find({ business: req.user.business._id });
    res.json(data);
  } catch (err) { next(err); }
});
router.post('/', async (req, res, next) => {
  try {
    const cat = await Category.create({ ...req.body, business: req.user.business._id });
    res.status(201).json(cat);
  } catch (err) { next(err); }
});
router.put('/:id', async (req, res, next) => {
  try {
    const cat = await Category.findOneAndUpdate({ _id: req.params.id, business: req.user.business._id }, req.body, { new: true });
    res.json(cat);
  } catch (err) { next(err); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    await Category.findOneAndDelete({ _id: req.params.id, business: req.user.business._id });
    res.json({ message: 'Category deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
