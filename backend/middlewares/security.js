import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';

// Rate limiting
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for API calls (stricter)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 API calls per windowMs
  message: 'Too many API requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for auth endpoints (stricter still - these are brute-force targets)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 register/login attempts per IP per 15 minutes
  message: 'Too many login/register attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Security headers
export const securityHeaders = helmet();

// Data sanitization
export const sanitizeData = (req, res, next) => {
  mongoSanitize()(req, res, () => {});
  xss()(req, res, next);
};