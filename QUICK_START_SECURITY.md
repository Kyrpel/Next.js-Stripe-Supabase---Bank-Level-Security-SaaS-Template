# Quick Start: Security Setup

This guide will get your security features running in **15 minutes**.

---

## Step 1: Install Dependencies (Already Done)

```bash
npm install
# Security packages already included:
# - @arcjet/next (rate limiting)
# - zod (validation)
# - isomorphic-dompurify (sanitization)
# - bcryptjs (password hashing)
```

---

## Step 2: Get Arcjet API Key (5 minutes)

1. Go to [arcjet.com](https://arcjet.com)
2. Sign up (free tier available)
3. Create a new site
4. Copy your API key
5. Add to `.env.local`:

```bash
ARCJET_KEY=ajkey_xxxxxxxxxxxxx
```

---

## Step 3: Apply Security Database Migration (3 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy contents of `supabase/migrations/001_security_enhancements.sql`
3. Paste and run in SQL Editor
4. Verify success: Check **Database** → **Tables** → You should see:
   - `security_events`
   - `login_attempts`
   - `audit_log`
   - `data_retention_policy`

---

## Step 4: Test Security Features (5 minutes)

### Test Rate Limiting

```bash
# Start dev server
npm run dev

# Open another terminal and test
for i in {1..10}; do curl http://localhost:3000/api/test; done

# Should see 429 error after hitting limit
```

### Test Input Sanitization

```typescript
// Test in any API route
import { sanitizeHtml } from '@/utils/security';

const userInput = '<script>alert("xss")</script>Hello';
const clean = sanitizeHtml(userInput);
console.log(clean); // Output: "Hello" (script removed)
```

### Test Security Monitoring

```typescript
import { logSecurityEvent, SecurityEventType } from '@/lib/security-monitoring';

await logSecurityEvent(
  'user-uuid',
  SecurityEventType.LOGIN_SUCCESS,
  { method: 'password' },
  '192.168.1.1',
  'Mozilla/5.0'
);

// Check: Supabase → Table Editor → security_events
```

---

## Step 5: Run Security Check (2 minutes)

```bash
npm run security-check
```

Expected output:
```
🔒 Running Security Checks...

Environment variables set...
   ✅ PASS

No test keys in production...
   ✅ PASS

Security headers configured...
   ✅ PASS

✅ All security checks passed!
```

---

## Step 6: Customize Rate Limits (Optional)

Edit `lib/arcjet.ts`:

```typescript
// Standard endpoints: 100 req/min
// Strict endpoints: 20 req/min  
// Auth endpoints: 5 req/5min

// Adjust based on your needs:
tokenBucket({
  mode: "LIVE",
  refillRate: 10,    // ← Change this
  interval: 60,      // ← And this
  capacity: 100,     // ← And this
})
```

---

## What You Get

### ✅ Security Headers
Every response includes:
- Content-Security-Policy
- Strict-Transport-Security
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

### ✅ Rate Limiting
Automatic protection against:
- Brute force attacks (5 attempts/5min on auth)
- API abuse (100 req/min standard endpoints)
- DDoS attacks (Bot detection enabled)

### ✅ Input Validation
All user inputs are:
- Sanitized (XSS prevention)
- Validated (Zod schemas)
- Type-checked (TypeScript)

### ✅ Database Security
- Row Level Security (RLS) enabled
- Audit logging on all sensitive tables
- Encryption functions available
- GDPR compliance ready

### ✅ Monitoring
- Security event logging
- Suspicious activity detection
- Audit trail for compliance

---

## Quick Fixes

### "Arcjet is blocking legitimate requests"

Adjust rate limits in `lib/arcjet.ts`:
```typescript
capacity: 200  // Increase from 100
```

### "I need to skip rate limiting in development"

```typescript
// lib/arcjet.ts
mode: process.env.NODE_ENV === 'production' ? "LIVE" : "DRY_RUN"
```

### "Security check fails on environment variables"

Ensure all required vars are in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
INTERNAL_API_KEY=
ARCJET_KEY=
```

---

## Next Steps

1. **Read [SECURITY.md](./SECURITY.md)** for complete documentation
2. **Enable 2FA** on Supabase, Stripe, Vercel accounts
3. **Set up monitoring** (Sentry recommended)
4. **Test with your own scans** (if building pentesting SaaS)
5. **Deploy!** `npm run pre-deploy`

---

## Need Help?

- 📖 Full docs: [SECURITY.md](./SECURITY.md)
- 🐛 Issues: Open on GitHub
- 💬 Discord: [Join server]

---

**Security is now active! 🛡️**

Run `npm run security-check` before every deployment.
