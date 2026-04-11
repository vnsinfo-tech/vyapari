// Generic paginated list helper
exports.paginatedList = (Model, filterFn) => async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, sort = '-createdAt' } = req.query;
    const query = { business: req.user.business._id, isDeleted: false, ...filterFn?.(req) };
    if (search) query.name = new RegExp(search, 'i');
    const [data, total] = await Promise.all([
      Model.find(query).sort(sort).skip((page - 1) * limit).limit(+limit),
      Model.countDocuments(query),
    ]);
    res.json({ data, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};
