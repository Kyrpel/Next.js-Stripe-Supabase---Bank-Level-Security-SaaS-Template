import { type NextRequest, NextResponse } from 'next/server';
import { aj, ajAuth } from './lib/arcjet';
import { cloudflareGuard, getCloudflareInfo, getClientIp } from './lib/cloudflare';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Layer 1: Cloudflare Security (perimeter) ──────────────────────────
  // Checks: CF proxy verification, geo-blocking, threat score
  // Returns early with 403 if the request is blocked at the edge level.
  const cfResponse = cloudflareGuard(request);
  if (cfResponse) return cfResponse;

  // Extract CF metadata for downstream logging / headers
  const cf = getCloudflareInfo(request);
  const clientIp = getClientIp(request);

  // ─── Layer 2: Arcjet Rate Limiting & Bot Detection ─────────────────────

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

  // ─── Layer 3: Application-Level Checks ─────────────────────────────────

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

  // ─── Add Security Headers to Response ──────────────────────────────────
  const response = NextResponse.next();

  // Runtime security headers
  response.headers.set('X-Request-ID', crypto.randomUUID());

  // Propagate Cloudflare metadata so API routes / logging can use it
  if (cf.rayId) response.headers.set('X-CF-Ray', cf.rayId);
  if (cf.country) response.headers.set('X-CF-Country', cf.country);
  if (clientIp !== 'unknown') response.headers.set('X-Client-IP', clientIp);

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
