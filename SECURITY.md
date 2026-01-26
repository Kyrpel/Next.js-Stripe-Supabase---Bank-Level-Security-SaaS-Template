# Security Documentation

## 🔒 Bank-Level Security Features

This template has been hardened with enterprise-grade security features suitable for production SaaS applications, including penetration testing platforms.

---

## Table of Contents

1. [Security Features Overview](#security-features-overview)
2. [Security Headers](#security-headers)
3. [Rate Limiting & Bot Protection](#rate-limiting--bot-protection)
4. [Input Validation & Sanitization](#input-validation--sanitization)
5. [Authentication Security](#authentication-security)
6. [Database Security](#database-security)
7. [API Security](#api-security)
8. [Monitoring & Audit Logging](#monitoring--audit-logging)
9. [GDPR Compliance](#gdpr-compliance)
10. [Pre-Deployment Security Checks](#pre-deployment-security-checks)
11. [Penetration Testing SaaS Stack](#penetration-testing-saas-stack)
12. [Security Best Practices](#security-best-practices)

---

## Security Features Overview

### ✅ Implemented Security Controls

- **🛡️ Security Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **🚦 Rate Limiting**: Arcjet-based protection against abuse
- **🤖 Bot Detection**: Automated bot blocking with search engine allowlist
- **🔐 Input Sanitization**: DOMPurify + Zod validation on all inputs
- **🔑 Authentication Security**: Supabase Auth with account lockout
- **🗄️ Database Security**: Row Level Security (RLS) + audit logging
- **📊 Security Monitoring**: Real-time event logging and threat detection
- **📋 Audit Trails**: Comprehensive logging of all sensitive operations
- **🔒 Data Encryption**: PGCrypto for sensitive data at rest
- **⚖️ GDPR Compliance**: Data export, right to be forgotten
- **✅ Pre-Deployment Checks**: Automated security validation

---

## Security Headers

### Configured Headers

All responses include the following security headers:

```typescript
// next.config.ts
- Content-Security-Policy (CSP) - Prevents XSS attacks
- Strict-Transport-Security (HSTS) - Forces HTTPS
- X-Frame-Options: DENY - Prevents clickjacking
- X-Content-Type-Options: nosniff - Prevents MIME sniffing
- X-XSS-Protection - Legacy XSS protection
- Referrer-Policy - Controls referrer information
- Permissions-Policy - Restricts browser features
```

### Verify Security Headers

```bash
curl -I https://your-app.vercel.app | grep -E "X-|Content-Security|Strict-Transport"
```

---

## Rate Limiting & Bot Protection

### Arcjet Integration

Three rate limiting profiles:

**1. Standard API Endpoints**
```typescript
// lib/arcjet.ts - aj
- 100 requests per minute per IP
- Bot detection enabled
- Shield protection against common attacks
```

**2. Strict Endpoints (Payments, Profile Changes)**
```typescript
// lib/arcjet.ts - ajStrict
- 20 requests per minute per IP
- No bots allowed
- Enhanced protection
```

**3. Authentication Endpoints**
```typescript
// lib/arcjet.ts - ajAuth
- 5 attempts per 5 minutes per IP
- Prevents brute force attacks
- Account lockout integration
```

### Setup

1. Sign up at [arcjet.com](https://arcjet.com)
2. Get API key
3. Add to `.env.local`:
```bash
ARCJET_KEY=ajkey_xxxxxxxxxxxxx
```

---

## Input Validation & Sanitization

### Automatic Sanitization

All user inputs are sanitized using DOMPurify:

```typescript
// utils/security.ts
import { sanitizeHtml, sanitizeObject } from '@/utils/security';

// Sanitize single value
const clean = sanitizeHtml(userInput);

// Sanitize entire object
const cleanData = sanitizeObject(formData);
```

### Zod Validation Schemas

```typescript
// utils/security.ts
import { passwordSchema, emailSchema, urlSchema } from '@/utils/security';

// Password validation (12+ chars, complexity)
passwordSchema.parse('SecureP@ss123');

// Email validation
emailSchema.parse('user@example.com');

// URL validation
urlSchema.parse('https://example.com');
```

### API Route Validation Middleware

```typescript
// app/api/your-endpoint/route.ts
import { withValidation } from '@/lib/api-middleware';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email()
});

export const POST = withValidation(schema, async (req, data) => {
  // data is validated and sanitized
  return NextResponse.json({ success: true });
});
```

---

## Authentication Security

### Account Lockout Protection

Implemented via Supabase function:

```sql
-- supabase/migrations/001_security_enhancements.sql
-- Locks account after 5 failed attempts for 15 minutes
SELECT public.is_account_locked('user@example.com', '192.168.1.1');
```

### Usage in Login

```typescript
import { checkRateLimit } from '@/utils/security';

// In login route
const { allowed } = checkRateLimit(email + ipAddress, 5, 15 * 60 * 1000);

if (!allowed) {
  return NextResponse.json(
    { error: 'Account locked. Try again in 15 minutes.' },
    { status: 429 }
  );
}
```

### Enable Multi-Factor Authentication (Recommended)

```typescript
// Enable in Supabase Dashboard:
// Authentication > Providers > Phone (for SMS 2FA)
// OR
// Authentication > Settings > Enable TOTP

const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'Authenticator App'
});
```

---

## Database Security

### Row Level Security (RLS)

All tables have RLS enabled:

```sql
-- initial_supabase_table_schema.sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);
```

### Audit Logging

All changes to sensitive tables are logged:

```sql
-- Automatically tracks INSERT, UPDATE, DELETE
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
```

View audit logs:
```sql
SELECT * FROM public.audit_log 
WHERE user_id = 'user-uuid' 
ORDER BY created_at DESC;
```

### Data Encryption

Encrypt sensitive data at rest:

```sql
-- Encrypt
SELECT public.encrypt_sensitive_data('sensitive-info');

-- Decrypt
SELECT public.decrypt_sensitive_data('encrypted-string');
```

---

## API Security

### Internal API Key Protection

Email endpoints require internal API key:

```typescript
// middleware.ts
if (pathname.startsWith('/api/email/send')) {
  const apiKey = request.headers.get('x-api-key');
  
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

### Stripe Webhook Verification

```typescript
// app/api/stripe/webhook/route.ts
const sig = request.headers.get('stripe-signature')!;
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
```

### CORS Configuration

```typescript
// utils/cors.ts
export function withCors(handler: Function) {
  return async (req: NextRequest) => {
    // Verify origin
    const origin = req.headers.get('origin');
    
    if (origin && !allowedOrigins.includes(origin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return handler(req);
  };
}
```

---

## Monitoring & Audit Logging

### Security Event Types

```typescript
// lib/security-monitoring.ts
enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  ACCOUNT_LOCKED = 'account_locked',
  PASSWORD_RESET = 'password_reset',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_EXPORT = 'data_export',
  PAYMENT_CHANGE = 'payment_change',
  UNAUTHORIZED_ACCESS = 'unauthorized_access'
}
```

### Log Security Events

```typescript
import { logSecurityEvent, SecurityEventType } from '@/lib/security-monitoring';

await logSecurityEvent(
  userId,
  SecurityEventType.LOGIN_SUCCESS,
  { method: 'password' },
  ipAddress,
  userAgent
);
```

### Suspicious Activity Detection

```typescript
import { detectSuspiciousActivity } from '@/lib/security-monitoring';

const { suspicious, reason } = await detectSuspiciousActivity(userId, ipAddress);

if (suspicious) {
  // Alert security team
  // Lock account
  // Require additional verification
}
```

### View Security Logs

```typescript
import { getSecurityAuditLog } from '@/lib/security-monitoring';

const logs = await getSecurityAuditLog(userId, 50);
```

---

## GDPR Compliance

### Data Export

```typescript
// app/api/gdpr/export-data/route.ts
export async function POST(req: Request) {
  const user = await getUser();
  
  // Export all user data
  const userData = {
    personal_data: await getUserData(user.id),
    subscriptions: await getSubscriptions(user.id),
    activity_log: await getAuditLog(user.id),
    exported_at: new Date().toISOString()
  };
  
  return NextResponse.json(userData);
}
```

### Right to Be Forgotten

```sql
-- Anonymize user data (keeps audit trail)
SELECT public.anonymize_user_data('user-uuid');
```

### Data Retention Policy

```sql
-- Schedule deletion (30-day grace period)
INSERT INTO public.data_retention_policy (
  user_id,
  deletion_requested_at,
  deletion_scheduled_for
) VALUES (
  'user-uuid',
  NOW(),
  NOW() + INTERVAL '30 days'
);
```

---

## Pre-Deployment Security Checks

### Run Security Checks

```bash
npm run security-check
```

### What It Checks

1. ✅ All required environment variables set
2. ✅ No test API keys in production
3. ✅ No hardcoded secrets in code
4. ✅ Dependencies have no high/critical vulnerabilities
5. ✅ TypeScript compiles without errors
6. ✅ Security headers configured
7. ✅ `.env` files not committed to git
8. ✅ Rate limiting middleware exists
9. ✅ Supabase RLS enabled
10. ✅ ESLint passes (warning if fails)

### Add to CI/CD

```yaml
# .github/workflows/deploy.yml
- name: Security Check
  run: npm run security-check
  
- name: Build
  run: npm run build
```

---

## Penetration Testing SaaS Stack

### Can I Build a Pentesting SaaS with This Template?

**Yes!** This template is specifically hardened for security-focused SaaS applications.

### Recommended Stack for Pentesting SaaS

#### 1. Core Backend (Current Template)
- ✅ **Next.js 15** - React framework
- ✅ **Supabase** - PostgreSQL + Auth + RLS
- ✅ **Stripe** - Payment processing
- ✅ **Vercel** - Hosting with DDoS protection

#### 2. Security Testing Tools

**OWASP ZAP** (Web Application Scanner)
```javascript
// Integration via REST API
const zapApiKey = process.env.ZAP_API_KEY;
const targetUrl = 'https://target-app.com';

// Start scan
await fetch(
  `http://localhost:8080/JSON/ascan/action/scan/?apikey=${zapApiKey}&url=${targetUrl}`
);

// Get results
const alerts = await fetch(
  `http://localhost:8080/JSON/core/view/alerts/?apikey=${zapApiKey}&baseurl=${targetUrl}`
).then(r => r.json());
```

**Nuclei** (Template-Based Scanner)
```javascript
// Integration via CLI
const { exec } = require('child_process');

exec(`nuclei -u ${targetUrl} -t ./custom-templates/ -json -o results.json`, 
  (error, stdout) => {
    const vulnerabilities = JSON.parse(fs.readFileSync('results.json'));
  }
);
```

**SQLMap** (SQL Injection Scanner)
```javascript
// SQLMap API
const sqlmap = new SQLMapAPI('http://localhost:8775');

const taskId = await sqlmap.createTask();
await sqlmap.startScan(taskId, targetUrl);

// Poll for results
const results = await sqlmap.getScanData(taskId);
```

**Nikto** (Web Server Scanner)
```bash
nikto -h https://target.com -Format json -output results.json
```

#### 3. Backend-Specific Scanners

**Supabase Security Scanner** (Custom)
```typescript
// Custom scanner for Supabase apps
async function scanSupabaseApp(url: string, anonKey: string) {
  const vulnerabilities = [];
  
  // Check RLS policies
  const rlsTest = await testRLSPolicies(url, anonKey);
  
  // Check for exposed service_role keys
  const keyCheck = await checkExposedKeys(url);
  
  // Check storage bucket permissions
  const storageTest = await testStorageSecurity(url, anonKey);
  
  return { vulnerabilities, summary };
}
```

**Firebase Security Scanner** (Custom)
```typescript
// Custom scanner for Firebase apps
async function scanFirebaseApp(projectId: string, apiKey: string) {
  // Test Firestore rules
  const firestoreTest = await testFirestoreRules(projectId);
  
  // Test Realtime DB rules
  const rtdbTest = await testRealtimeDBRules(projectId);
  
  // Check API key restrictions
  const apiKeyTest = await checkAPIKeyRestrictions(apiKey);
  
  return { vulnerabilities, summary };
}
```

#### 4. Architecture for Pentesting SaaS

```
┌─────────────────────────────────────────────┐
│           Your Pentesting SaaS              │
│       (This Template - Next.js/Supabase)    │
└─────────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        │   Job Queue (Redis)   │
        └───────────┬───────────┘
                    ↓
    ┌───────────────┴───────────────┐
    ↓                               ↓
┌─────────────┐              ┌─────────────┐
│  Scanner 1  │              │  Scanner 2  │
│             │              │             │
│  • ZAP      │              │  • Nuclei   │
│  • SQLMap   │              │  • Custom   │
│  (Docker)   │              │  (CLI)      │
└─────────────┘              └─────────────┘
    ↓                               ↓
    └───────────────┬───────────────┘
                    ↓
        ┌───────────────────────┐
        │  Results Aggregation  │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │  Supabase Database    │
        │  (Store Results)      │
        └───────────────────────┘
                    ↓
        ┌───────────────────────┐
        │  User Dashboard       │
        │  (Visualize Results)  │
        └───────────────────────┘
```

#### 5. Required Additional Dependencies

```bash
npm install dockerode      # Docker container management
npm install bull           # Job queue
npm install redis          # Redis client
npm install chart.js       # Vulnerability visualization
```

#### 6. Example Scanner Integration

```typescript
// app/api/scan/start/route.ts
import { withValidation } from '@/lib/api-middleware';
import { z } from 'zod';

const scanSchema = z.object({
  target_url: z.string().url(),
  scan_type: z.enum(['quick', 'full', 'custom']),
  backend_type: z.enum(['supabase', 'firebase', 'appwrite', 'unknown'])
});

export const POST = withValidation(scanSchema, async (req, data) => {
  const user = await getUser(req);
  
  // Create scan job
  const scanJob = await createScanJob({
    user_id: user.id,
    target_url: data.target_url,
    scan_type: data.scan_type,
    status: 'queued'
  });
  
  // Queue scanners
  await queueZAPScan(scanJob.id, data.target_url);
  await queueNucleiScan(scanJob.id, data.target_url);
  
  if (data.backend_type !== 'unknown') {
    await queueBackendScan(scanJob.id, data.target_url, data.backend_type);
  }
  
  return NextResponse.json({ scan_id: scanJob.id });
});
```

---

## Security Best Practices

### Development

1. **Never commit secrets**
   ```bash
   # Add to .gitignore
   .env.local
   .env.*.local
   ```

2. **Use environment variables**
   ```bash
   # .env.local
   SUPABASE_SERVICE_ROLE_KEY=your-key-here
   ```

3. **Enable 2FA on all services**
   - Supabase Dashboard
   - Stripe Dashboard
   - Vercel Account
   - GitHub Account

4. **Review dependencies regularly**
   ```bash
   npm audit
   npm audit fix
   ```

### Production

1. **Use different API keys per environment**
   - Development: `sk_test_...`
   - Production: `sk_live_...`

2. **Enable Vercel DDoS Protection**
   ```bash
   # Vercel Dashboard > Project > Settings > Security
   ```

3. **Set up monitoring**
   - Sentry for error tracking
   - Vercel Analytics
   - Supabase logs

4. **Regular security audits**
   ```bash
   npm run security-check
   npm audit
   ```

5. **Run penetration tests**
   - Use your own tool!
   - Or hire: BugCrowd, HackerOne

### API Key Management

```typescript
// ✅ DO: Use environment variables
const apiKey = process.env.STRIPE_SECRET_KEY;

// ❌ DON'T: Hardcode in code
const apiKey = 'sk_test_123456789';

// ✅ DO: Rotate keys regularly
// ❌ DON'T: Use same keys forever
```

### Database Security

```sql
-- ✅ DO: Always enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- ✅ DO: Create restrictive policies
CREATE POLICY "Users see own data" ON your_table
  FOR SELECT USING (auth.uid() = user_id);

-- ❌ DON'T: Use permissive policies
CREATE POLICY "All access" ON your_table
  FOR ALL USING (true);  -- BAD!
```

---

## Security Incident Response

### If You Detect a Breach

1. **Immediately rotate all API keys**
   - Stripe
   - Supabase
   - Resend
   - Any other services

2. **Check security logs**
   ```sql
   SELECT * FROM public.security_events
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

3. **Notify affected users**
   - GDPR requires notification within 72 hours

4. **Review and patch vulnerability**

5. **Post-mortem analysis**
   - Document what happened
   - Update security measures

---

## Security Checklist

### Before Launch

- [ ] All environment variables set
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] RLS enabled on all tables
- [ ] Audit logging active
- [ ] No test keys in production
- [ ] Dependencies audited
- [ ] Security check passes
- [ ] 2FA enabled on all admin accounts
- [ ] Monitoring set up
- [ ] Incident response plan documented
- [ ] Privacy policy & ToS published
- [ ] GDPR compliance verified

### Monthly Maintenance

- [ ] Run security check
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Audit user permissions
- [ ] Test backup restoration
- [ ] Review rate limit effectiveness
- [ ] Check for new CVEs

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Stripe Security](https://stripe.com/docs/security/stripe)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Arcjet Documentation](https://docs.arcjet.com/)

---

## Support

For security concerns or questions:
- Open an issue on GitHub
- Contact: [your-security@email.com]
- Bug bounty program: [Coming soon]

---

**Remember: Security is not a feature, it's a process. Continuously monitor, audit, and improve your security posture.**
