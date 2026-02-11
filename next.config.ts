import type { NextConfig } from "next";
import path from "path";

// Bank-Level Security Headers
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://cdn.vercel-insights.com https://va.vercel-scripts.com https://app.posthog.com https://us.i.posthog.com https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co https://api.stripe.com https://vitals.vercel-insights.com https://app.posthog.com https://us.i.posthog.com wss://*.supabase.co;
  frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy
  }
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  headers: async () => [
    {
      source: '/:path*',
      headers: securityHeaders,
    },
  ],
  /* config options here */
};

export default nextConfig;
