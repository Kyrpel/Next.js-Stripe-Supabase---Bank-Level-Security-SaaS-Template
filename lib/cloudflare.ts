/**
 * Cloudflare Security Layer
 *
 * Provides server-side utilities that leverage Cloudflare's proxy headers
 * for threat detection, geographic blocking, Turnstile verification, and
 * request validation — all running inside Next.js middleware / API routes.
 *
 * Flow:  User → Cloudflare → (this code on Vercel) → Supabase
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  CF_HEADERS,
  CF_THREAT_SCORE_BLOCK,
  CF_THREAT_SCORE_CHALLENGE,
  BLOCKED_COUNTRIES,
  CLOUDFLARE_ENABLED,
  CF_BYPASS_PATHS,
  TURNSTILE_SECRET_KEY,
  TURNSTILE_VERIFY_URL,
} from '@/config/cloudflare';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CloudflareRequestInfo {
  /** ISO country code (e.g. "US", "DE") */
  country: string | null;
  /** Visitor IP as reported by Cloudflare */
  ip: string | null;
  /** Threat score 0-100 (lower is safer) */
  threatScore: number;
  /** CF ray ID – proves request went through CF */
  rayId: string | null;
  /** Whether the request actually came through Cloudflare */
  isProxied: boolean;
}

export interface TurnstileVerifyResult {
  success: boolean;
  /** Error codes returned by Turnstile API */
  errorCodes: string[];
  /** Challenge timestamp */
  challengeTs?: string;
  /** Hostname the challenge was solved on */
  hostname?: string;
}

// ─── Header Extraction ──────────────────────────────────────────────────────

/**
 * Extract Cloudflare-specific metadata from the request headers.
 */
export function getCloudflareInfo(request: NextRequest): CloudflareRequestInfo {
  const headers = request.headers;
  const rawThreat = headers.get(CF_HEADERS.threatScore);

  return {
    country: headers.get(CF_HEADERS.country),
    ip:
      headers.get(CF_HEADERS.connectingIp) ??
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null,
    threatScore: rawThreat ? parseInt(rawThreat, 10) : 0,
    rayId: headers.get(CF_HEADERS.ray),
    isProxied: !!headers.get(CF_HEADERS.ray),
  };
}

// ─── Middleware Guard ────────────────────────────────────────────────────────

/**
 * Run Cloudflare-level security checks inside Next.js middleware.
 * Returns a NextResponse (block / challenge) when the request should be
 * stopped, or `null` when the request is safe to continue.
 *
 * Call this BEFORE Arcjet or any other app-level checks.
 */
export function cloudflareGuard(
  request: NextRequest
): NextResponse | null {
  // Skip when Cloudflare integration is not enabled (e.g. local dev)
  if (!CLOUDFLARE_ENABLED) return null;

  const { pathname } = request.nextUrl;

  // Skip bypass paths (health-checks, static assets)
  if (CF_BYPASS_PATHS.some((p) => pathname.startsWith(p))) return null;

  const cf = getCloudflareInfo(request);

  // 1. Verify request actually came through Cloudflare
  //    (prevents attackers from hitting the Vercel URL directly)
  if (!cf.isProxied) {
    return NextResponse.json(
      { error: 'Direct access not allowed. Use the proxied domain.' },
      { status: 403 }
    );
  }

  // 2. Geographic blocking
  if (cf.country && BLOCKED_COUNTRIES.includes(cf.country.toUpperCase())) {
    return NextResponse.json(
      { error: 'Access denied from your region.' },
      { status: 403 }
    );
  }

  // 3. Threat score – hard block
  if (cf.threatScore >= CF_THREAT_SCORE_BLOCK) {
    console.warn(
      `[Cloudflare] Blocked high-threat request – score=${cf.threatScore}, ip=${cf.ip}, country=${cf.country}, ray=${cf.rayId}`
    );
    return NextResponse.json(
      { error: 'Request blocked due to security policy.' },
      { status: 403 }
    );
  }

  // 4. Threat score – soft challenge (log + add warning header)
  if (cf.threatScore >= CF_THREAT_SCORE_CHALLENGE) {
    console.warn(
      `[Cloudflare] Suspicious request – score=${cf.threatScore}, ip=${cf.ip}, country=${cf.country}, ray=${cf.rayId}`
    );
    // We don't block but downstream code can inspect the header
    const response = NextResponse.next();
    response.headers.set('X-CF-Threat-Level', 'elevated');
    return response;
  }

  return null; // All clear – continue to next checks
}

// ─── Turnstile Verification (server-side) ───────────────────────────────────

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Use this in API routes that protect forms (signup, contact, etc.).
 *
 * @param token - The `cf-turnstile-response` value from the client
 * @param ip    - Optional IP for additional validation
 */
export async function verifyTurnstile(
  token: string,
  ip?: string | null
): Promise<TurnstileVerifyResult> {
  if (!TURNSTILE_SECRET_KEY) {
    // If Turnstile is not configured, skip (dev mode)
    return { success: true, errorCodes: [] };
  }

  try {
    const body: Record<string, string> = {
      secret: TURNSTILE_SECRET_KEY,
      response: token,
    };
    if (ip) body.remoteip = ip;

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });

    const data = await res.json();

    return {
      success: data.success === true,
      errorCodes: data['error-codes'] ?? [],
      challengeTs: data.challenge_ts,
      hostname: data.hostname,
    };
  } catch (error) {
    console.error('[Cloudflare] Turnstile verification failed:', error);
    return { success: false, errorCodes: ['internal-error'] };
  }
}

// ─── Utility Helpers ────────────────────────────────────────────────────────

/**
 * Get the real client IP, preferring Cloudflare's header.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get(CF_HEADERS.connectingIp) ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Check whether a request went through the Cloudflare proxy.
 */
export function isCloudflareProxied(request: NextRequest): boolean {
  return !!request.headers.get(CF_HEADERS.ray);
}
