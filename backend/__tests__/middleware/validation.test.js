const { validateAccount } = require('../../middleware/validation');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('validateAccount', () => {
    it('should call next() if name is valid', () => {
      req.body.name = 'Test Account';

      validateAccount(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 if name is missing', () => {
      validateAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account name is required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if name is not a string', () => {
      req.body.name = 12345;

      validateAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account name is required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if name is empty string', () => {
      req.body.name = '';

      validateAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account name is required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if name is only whitespace', () => {
      req.body.name = '   ';

      validateAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account name is required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept name with leading/trailing whitespace', () => {
      req.body.name = '  Valid Name  ';

      validateAccount(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept name with special characters', () => {
      req.body.name = "John's Savings Account!";

      validateAccount(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
