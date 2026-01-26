# 🔒 Bank-Level Security SaaS Boilerplate - Complete Guide

## Welcome! 👋

You've just cloned **the most secure Next.js SaaS boilerplate on GitHub**. This guide will help you get started.

---

## 🎯 What You Get

This boilerplate is **100% production-ready** with:

### Security Features (Bank-Level)
- ✅ Rate limiting (Arcjet) - 3 protection profiles
- ✅ Bot detection & blocking
- ✅ Account lockout (5 attempts = 15 min lock)
- ✅ Input sanitization (XSS prevention)
- ✅ Input validation (Zod schemas)
- ✅ Security event logging
- ✅ Audit trails (complete history)
- ✅ Data encryption at rest
- ✅ GDPR compliance (export + deletion)
- ✅ Security headers (CSP, HSTS, etc.)
- ✅ Row Level Security (database)
- ✅ MFA/2FA ready

### Pre-Built API Routes
All security-critical routes are ready to use:
- `/api/auth/secure-login` - Secure login with lockout
- `/api/auth/mfa/enroll` - Enable 2FA
- `/api/auth/mfa/verify` - Verify 2FA codes
- `/api/gdpr/export-data` - Export user data
- `/api/gdpr/delete-account` - Delete with grace period

### SaaS Features
- Supabase authentication & database
- Stripe payment integration
- Email workflows (Resend)
- Dark mode support
- Responsive design
- TypeScript + Tailwind CSS

---

## 🚀 Quick Start (15 Minutes)

### Step 1: Clone & Install (2 min)

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Install dependencies
npm install
```

### Step 2: Set Up Environment Variables (3 min)

Create `.env.local` file:

```bash
# Copy example
cp .env.example .env.local
```

Add these variables:

```bash
# Supabase (get from https://supabase.com/dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Stripe (get from https://dashboard.stripe.com)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (get from https://resend.com/api-keys)
RESEND_API_KEY=re_...
INTERNAL_API_KEY=generate_random_key_here

# Arcjet - REQUIRED FOR SECURITY (get from https://arcjet.com)
ARCJET_KEY=ajkey_...

# Optional Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Step 3: Set Up Supabase Database (5 min)

1. **Create tables:**
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents of `initial_supabase_table_schema.sql`
   - Run it

2. **🔒 CRITICAL - Apply security migration:**
   - Still in SQL Editor
   - Copy contents of `supabase/migrations/001_security_enhancements.sql`
   - Run it

3. **Verify:**
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('security_events', 'login_attempts', 'audit_log');
   
   -- Should return 3 rows
   ```

### Step 4: Get Arcjet API Key (2 min)

**This is required for rate limiting and bot protection:**

1. Go to [arcjet.com](https://arcjet.com)
2. Sign up (free tier available)
3. Create a new site
4. Copy your API key
5. Add to `.env.local`: `ARCJET_KEY=ajkey_xxxxx`

### Step 5: Test Security (2 min)

```bash
# Run security check
npm run security-check

# Expected output:
# ✅ Environment variables set
# ✅ No test keys in production
# ✅ Security headers configured
# ✅ All security checks passed!
```

### Step 6: Start Development (1 min)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎓 Understanding the Security Features

### 1. Rate Limiting (Arcjet)

Three protection profiles protect your API:

```typescript
// Standard endpoints: 100 requests/minute
import { aj } from '@/lib/arcjet';

// Strict endpoints: 20 requests/minute  
import { ajStrict } from '@/lib/arcjet';

// Auth endpoints: 5 attempts per 5 minutes
import { ajAuth } from '@/lib/arcjet';
```

**Usage in your API routes:**

```typescript
// app/api/your-route/route.ts
import { aj } from '@/lib/arcjet';

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const decision = await aj.protect(req);
  
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  // Your logic here
}
```

### 2. Input Validation & Sanitization

All user inputs should be validated and sanitized:

```typescript
import { sanitizeHtml, passwordSchema, emailSchema } from '@/utils/security';
import { z } from 'zod';

// Sanitize input
const clean = sanitizeHtml(userInput);

// Validate with Zod
const schema = z.object({
  email: emailSchema,
  password: passwordSchema
});

const result = schema.parse(data);
```

### 3. Security Event Logging

Track all security-related events:

```typescript
import { logSecurityEvent, SecurityEventType } from '@/lib/security-monitoring';
import { getClientIp, getUserAgent } from '@/lib/api-middleware';

// Log login success
await logSecurityEvent(
  userId,
  SecurityEventType.LOGIN_SUCCESS,
  { method: 'password' },
  getClientIp(req),
  getUserAgent(req)
);
```

### 4. Account Lockout Protection

Automatic lockout after 5 failed attempts:

```typescript
import { checkAccountLockout, logLoginAttempt } from '@/utils/auth-security';

// Check if account is locked
const lockout = await checkAccountLockout(email, ipAddress);

if (lockout.locked) {
  return NextResponse.json(
    { error: lockout.message },
    { status: 429 }
  );
}

// Log the attempt
await logLoginAttempt({
  email,
  ipAddress,
  userAgent,
  successful: true
});
```

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── secure-login/route.ts    # ✅ Secure login
│   │   │   └── mfa/
│   │   │       ├── enroll/route.ts      # ✅ Enable 2FA
│   │   │       └── verify/route.ts      # ✅ Verify 2FA
│   │   ├── gdpr/
│   │   │   ├── export-data/route.ts     # ✅ GDPR export
│   │   │   └── delete-account/route.ts  # ✅ GDPR deletion
│   │   └── stripe/webhook/route.ts      # Stripe webhooks
│
├── lib/
│   ├── arcjet.ts                        # ✅ Rate limiting config
│   ├── security-monitoring.ts           # ✅ Event logging
│   └── api-middleware.ts                # ✅ Validation wrapper
│
├── utils/
│   ├── security.ts                      # ✅ Sanitization & schemas
│   ├── auth-security.ts                 # ✅ Lockout protection
│   ├── supabase-admin.ts                # Admin client
│   └── supabase.ts                      # Public client
│
├── middleware.ts                        # ✅ Global rate limiting
├── next.config.ts                       # ✅ Security headers
│
├── supabase/
│   └── migrations/
│       └── 001_security_enhancements.sql # ✅ Security tables
│
├── scripts/
│   └── security-check.ts                # ✅ Pre-deploy checks
│
└── examples/
    └── security-usage-examples.ts       # ✅ Code examples
```

---

## 🔧 Customization Guide

### Adjust Rate Limits

Edit `lib/arcjet.ts`:

```typescript
tokenBucket({
  mode: "LIVE",
  refillRate: 10,    // ← Change: tokens per interval
  interval: 60,      // ← Change: interval in seconds
  capacity: 100,     // ← Change: max requests
})
```

### Add Custom Validation

Create schemas in your routes:

```typescript
import { z } from 'zod';
import { withValidation } from '@/lib/api-middleware';

const mySchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().min(18)
});

export const POST = withValidation(mySchema, async (req, data) => {
  // data is validated and typed
});
```

### Add Security Events

Log custom events:

```typescript
await logSecurityEvent(
  userId,
  SecurityEventType.CUSTOM_EVENT, // Add to enum
  { your: 'metadata' },
  ipAddress,
  userAgent
);
```

---

## 🚢 Deployment

### Pre-Deployment Checklist

**ALWAYS run this before deploying:**

```bash
npm run security-check
```

This validates:
- ✅ All environment variables set
- ✅ No test API keys in production
- ✅ No hardcoded secrets
- ✅ Dependencies have no vulnerabilities
- ✅ Security headers configured
- ✅ RLS enabled on database

### Deploy to Vercel

```bash
# 1. Build with security check
npm run pre-deploy

# 2. Deploy
vercel deploy --prod

# 3. Set environment variables in Vercel Dashboard
```

**Critical:** Make sure to:
1. Use **production** API keys (not test keys)
2. Add ALL environment variables in Vercel
3. Enable Vercel DDoS protection
4. Set up domain with SSL

### Post-Deployment

1. **Test security:**
   ```bash
   curl -I https://your-domain.com | grep -E "X-|Content-Security|Strict-Transport"
   ```

2. **Monitor logs:**
   - Supabase: Dashboard → Logs
   - Vercel: Dashboard → Logs
   - Check `security_events` table

3. **Set up monitoring:**
   - Add Sentry for error tracking
   - Set up alerts for critical security events

---

## 🧪 Testing Your Security

### Test Rate Limiting

```bash
# Hit API repeatedly
for i in {1..150}; do 
  curl http://localhost:3000/api/test
done

# Should see 429 errors after limit
```

### Test Account Lockout

1. Try logging in with wrong password 5 times
2. Should see: "Account locked. Try again in 15 minutes."

### Test Input Sanitization

```typescript
import { sanitizeHtml } from '@/utils/security';

const dirty = '<script>alert("xss")</script>Hello';
const clean = sanitizeHtml(dirty);
// Output: "Hello" (script removed)
```

### Test Security Events

```sql
-- Check security logs
SELECT * FROM public.security_events 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🛡️ Security Best Practices

### Do's ✅

- ✅ **Enable 2FA** on all service accounts (Supabase, Stripe, Vercel)
- ✅ **Rotate API keys** quarterly
- ✅ **Run security-check** before every deployment
- ✅ **Monitor security_events** table weekly
- ✅ **Update dependencies** monthly (`npm audit`)
- ✅ **Use environment variables** for all secrets
- ✅ **Test with real penetration testing tools**

### Don'ts ❌

- ❌ **Never commit** `.env.local` or API keys
- ❌ **Never use test keys** in production
- ❌ **Never skip** security migration
- ❌ **Never disable** rate limiting
- ❌ **Never hard-code** secrets in code
- ❌ **Never deploy** without running `security-check`

---

## 📚 Additional Resources

### Documentation
- [SECURITY.md](./SECURITY.md) - Complete security guide (400+ lines)
- [QUICK_START_SECURITY.md](./QUICK_START_SECURITY.md) - 15-min setup
- [examples/security-usage-examples.ts](./examples/security-usage-examples.ts) - Code examples

### External Links
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Docs](https://supabase.com/docs/guides/platform/security)
- [Stripe Security Best Practices](https://stripe.com/docs/security/guide)
- [Arcjet Documentation](https://docs.arcjet.com/)

---

## 🆘 Troubleshooting

### "ARCJET_KEY not found"
Add to `.env.local`: `ARCJET_KEY=ajkey_...`

### "security_events table does not exist"
Run the security migration: `supabase/migrations/001_security_enhancements.sql`

### "Rate limit blocking legitimate users"
Increase limits in `lib/arcjet.ts`:
```typescript
capacity: 200  // Increase from 100
```

### "Security check fails"
Check each item:
```bash
npm run security-check

# Fix missing variables in .env.local
# Remove test keys from production
# Run npm audit fix
```

---

## 🤝 Contributing

Found a security issue? Please report it responsibly:
1. DO NOT open a public issue
2. Email: [your-security@email.com]
3. Include: Steps to reproduce, impact, suggested fix

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file

---

## 🎉 You're Ready!

Your boilerplate is now set up with bank-level security. Key points:

1. ✅ All security features are active
2. ✅ All API routes are production-ready
3. ✅ Run `npm run security-check` before deploying
4. ✅ Read [SECURITY.md](./SECURITY.md) for complete docs

**Start building your secure SaaS!** 🚀

---

**Questions?** Open an issue on GitHub or check the documentation files.

**Security concerns?** See [SECURITY.md](./SECURITY.md) for incident response procedures.
