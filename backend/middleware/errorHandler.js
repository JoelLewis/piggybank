const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    
    if (err.message === 'Insufficient funds') {
        return res.status(400).json({ error: 'Insufficient funds' });
    }
    
    if (err.message === 'Account not found') {
        return res.status(404).json({ error: 'Account not found' });
    }

    res.status(500).json({ error: 'Internal Server Error' });
};

module.exports = errorHandler;
