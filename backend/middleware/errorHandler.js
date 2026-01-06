const errorHandler = (err, req, res, next) => {
    // Log error stack only in development or if explicitly enabled
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    } else {
        // In production, log only the message to avoid leaking stack traces in logs
        console.error(`Error: ${err.message}`);
    }
    
    if (err.message === 'Insufficient funds') {
        return res.status(400).json({ error: 'Insufficient funds' });
    }
    
    if (err.message === 'Account not found') {
        return res.status(404).json({ error: 'Account not found' });
    }

    if (err.message === 'The CORS policy for this site does not allow access from the specified Origin.') {
        return res.status(403).json({ error: 'CORS forbidden' });
    }

    res.status(500).json({ error: 'Internal Server Error' });
};

module.exports = errorHandler;
