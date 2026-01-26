import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeObject } from '@/utils/security';

/**
 * Middleware to validate and sanitize API request data
 * Usage:
 * 
 * export const POST = withValidation(
 *   z.object({ name: z.string(), email: z.string().email() }),
 *   async (req, data) => {
 *     // data is typed and validated
 *     return NextResponse.json({ success: true });
 *   }
 * );
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, data: T) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Sanitize input
      const sanitized = sanitizeObject(body);

      // Validate with Zod
      const validated = schema.parse(sanitized);

      return await handler(req, validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input', details: error.errors },
          { status: 400 }
        );
      }

      console.error('API validation error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Extract client IP address from request
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Extract user agent from request
 */
export function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'unknown';
}

/**
 * Check if request is from localhost
 */
export function isLocalhost(req: NextRequest): boolean {
  const ip = getClientIp(req);
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
}
