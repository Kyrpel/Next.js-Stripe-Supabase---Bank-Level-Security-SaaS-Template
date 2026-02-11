/**
 * Cloudflare Security Configuration
 *
 * This config controls the Cloudflare security layer that sits in front of Vercel.
 * When your domain is proxied through Cloudflare (orange cloud), every request
 * arrives with CF-* headers that we can use for server-side threat detection.
 *
 * Architecture:
 *   User → Cloudflare (WAF + CDN) → Vercel (Next.js) → Supabase
 */

// ---------------------------------------------------------------------------
// Threat score threshold (0 = trusted, 100 = worst offender)
// Cloudflare's Cf-Threat-Score header ranges from 0-100.
// ---------------------------------------------------------------------------
export const CF_THREAT_SCORE_BLOCK = Number(
  process.env.CF_THREAT_SCORE_BLOCK ?? 30
);
export const CF_THREAT_SCORE_CHALLENGE = Number(
  process.env.CF_THREAT_SCORE_CHALLENGE ?? 15
);

// ---------------------------------------------------------------------------
// Geographic blocking – ISO 3166-1 alpha-2 country codes to block entirely.
// Comma-separated in the env var, e.g. "KP,IR,CU"
// Override via CLOUDFLARE_BLOCKED_COUNTRIES env var.
// ---------------------------------------------------------------------------
const defaultBlockedCountries: string[] = [];
export const BLOCKED_COUNTRIES: string[] = process.env
  .CLOUDFLARE_BLOCKED_COUNTRIES
  ? process.env.CLOUDFLARE_BLOCKED_COUNTRIES.split(',').map((c) => c.trim().toUpperCase())
  : defaultBlockedCountries;

// ---------------------------------------------------------------------------
// Turnstile (CAPTCHA replacement) – protects forms without annoying CAPTCHAs
// ---------------------------------------------------------------------------
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
export const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY ?? '';
export const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// ---------------------------------------------------------------------------
// Whether Cloudflare proxy is enabled (set to "true" when domain is proxied)
// When false, CF header checks are skipped so local dev still works.
// ---------------------------------------------------------------------------
export const CLOUDFLARE_ENABLED =
  process.env.CLOUDFLARE_ENABLED === 'true';

// ---------------------------------------------------------------------------
// Paths that SKIP Cloudflare threat-score / geo checks (e.g. health checks)
// ---------------------------------------------------------------------------
export const CF_BYPASS_PATHS: string[] = [
  '/api/health',
  '/_next',
  '/favicon.ico',
];

// ---------------------------------------------------------------------------
// Cloudflare-specific header names (set automatically by the CF proxy)
// ---------------------------------------------------------------------------
export const CF_HEADERS = {
  /** Two-letter ISO country code of the visitor */
  country: 'cf-ipcountry',
  /** The visitor's IP as seen by Cloudflare */
  connectingIp: 'cf-connecting-ip',
  /** Threat score 0-100 */
  threatScore: 'cf-threat-score',
  /** Unique ray-id for every request (proves traffic went through CF) */
  ray: 'cf-ray',
  /** WAF action taken (if any) */
  wafAction: 'cf-waf-action',
  /** Bot management score (Enterprise) */
  botScore: 'cf-bot-score',
} as const;
