import { type NextRequest, NextResponse } from 'next/server';
import { aj, ajAuth } from './lib/arcjet';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply strict rate limiting to authentication endpoints
  if (
    pathname.startsWith('/api/auth') ||
    pathname.includes('login') ||
    pathname.includes('signup')
  ) {
    const decision = await ajAuth.protect(request);

    if (decision.isDenied()) {
      return NextResponse.json(
        {
          error: 'Too many authentication attempts. Please try again later.',
          retryAfter: decision.reason,
        },
        { status: 429 }
      );
    }
  }

  // Apply standard rate limiting to all API routes
  if (pathname.startsWith('/api/')) {
    const decision = await aj.protect(request);

    if (decision.isDenied()) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      );
    }
  }

  // Verify internal API key for email endpoints
  if (pathname.startsWith('/api/email/send')) {
    const apiKey = request.headers.get('x-api-key');

    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();

  // Additional runtime security headers
  response.headers.set('X-Request-ID', crypto.randomUUID());

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/profile/:path*',
  ],
};
