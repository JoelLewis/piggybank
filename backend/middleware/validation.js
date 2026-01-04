const validateAccount = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Account name is required' });
    }
    // Additional validation can go here
    next();
};

module.exports = { validateAccount };
