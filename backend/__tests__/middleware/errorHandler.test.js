const errorHandler = require('../../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    // Mock console.error to avoid cluttering test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('should return 400 for insufficient funds error', () => {
    const error = new Error('Insufficient funds');

    errorHandler(error, req, res, next);

    expect(console.error).toHaveBeenCalledWith(error.stack);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient funds' });
  });

  it('should return 404 for account not found error', () => {
    const error = new Error('Account not found');

    errorHandler(error, req, res, next);

    expect(console.error).toHaveBeenCalledWith(error.stack);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
  });

  it('should return 500 for generic errors', () => {
    const error = new Error('Something went wrong');

    errorHandler(error, req, res, next);

    expect(console.error).toHaveBeenCalledWith(error.stack);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
  });

  it('should return 500 with default message if error has no message', () => {
    const error = new Error();
    error.message = '';

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });

  it('should log error stack', () => {
    const error = new Error('Test error');
    const stack = error.stack;

    errorHandler(error, req, res, next);

    expect(console.error).toHaveBeenCalledWith(stack);
  });
});
