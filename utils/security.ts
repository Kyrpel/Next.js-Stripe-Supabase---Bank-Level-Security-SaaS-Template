import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

/**
 * Sanitize HTML input to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML allowed by default
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize all string fields in an object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeHtml(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]) as any;
    }
  }

  return sanitized;
}

/**
 * Strong password validation schema
 * Requires: 12+ chars, uppercase, lowercase, number, special char
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

/**
 * URL validation schema
 */
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .regex(/^https?:\/\//, 'URL must start with http:// or https://');

/**
 * UUID validation schema
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

/**
 * Validate and sanitize data using a Zod schema
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Check if a string contains potentially malicious patterns
 */
export function detectSuspiciousPatterns(input: string): boolean {
  const suspiciousPatterns = [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    // XSS patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    // Command injection patterns
    /[;&|`$()]/g,
    // Path traversal
    /\.\.[\/\\]/g,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Mask sensitive data for logging (e.g., email, credit cards)
 */
export function maskSensitiveData(data: string, type: 'email' | 'card' | 'key'): string {
  switch (type) {
    case 'email':
      const [local, domain] = data.split('@');
      if (!domain) return '***';
      return `${local.slice(0, 2)}***@${domain}`;
    case 'card':
      return `****-****-****-${data.slice(-4)}`;
    case 'key':
      return `${data.slice(0, 8)}...${data.slice(-4)}`;
    default:
      return '***';
  }
}

/**
 * Rate limit check using in-memory storage
 * For production, use Redis or a proper rate limiting service
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * Clean up expired rate limit entries
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute
