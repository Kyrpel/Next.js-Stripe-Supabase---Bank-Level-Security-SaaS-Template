/**
 * Security Usage Examples
 * 
 * This file demonstrates how to use the security features
 * in your application code.
 */

// =================================
// 1. RATE LIMITING WITH ARCJET
// =================================

// app/api/your-endpoint/route.ts
import { aj, ajStrict, ajAuth } from '@/lib/arcjet';
import { NextRequest, NextResponse } from 'next/server';

// Standard rate limiting (100 req/min)
export async function GET(req: NextRequest) {
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // Your logic here
  return NextResponse.json({ data: 'success' });
}

// Strict rate limiting for sensitive endpoints (20 req/min)
export async function POST_Strict(req: NextRequest) {
  const decision = await ajStrict.protect(req);

  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // Sensitive operation
  return NextResponse.json({ success: true });
}

// Auth rate limiting (5 attempts/5min)
export async function POST_Auth(req: NextRequest) {
  const decision = await ajAuth.protect(req);

  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again in 5 minutes.' },
      { status: 429 }
    );
  }

  // Login logic
  return NextResponse.json({ success: true });
}

// =================================
// 2. INPUT VALIDATION & SANITIZATION
// =================================

import { 
  sanitizeHtml, 
  sanitizeObject, 
  validateAndSanitize,
  passwordSchema,
  emailSchema 
} from '@/utils/security';
import { z } from 'zod';

// Example 1: Sanitize single input
export function sanitizeUserInput(userInput: string) {
  const clean = sanitizeHtml(userInput);
  console.log(clean); // XSS removed
  return clean;
}

// Example 2: Sanitize entire object
export function sanitizeFormData(formData: any) {
  const clean = sanitizeObject(formData);
  return clean;
}

// Example 3: Validate and sanitize with Zod
const userSchema = z.object({
  name: z.string().min(1).max(100),
  email: emailSchema,
  password: passwordSchema
});

export function validateUser(data: unknown) {
  const result = validateAndSanitize(userSchema, data);
  
  if (!result.success) {
    return { error: result.error };
  }
  
  return { data: result.data };
}

// =================================
// 3. API MIDDLEWARE WITH VALIDATION
// =================================

import { withValidation } from '@/lib/api-middleware';

// Define schema
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(18)
});

// Use middleware - automatic validation & sanitization
export const POST_WithValidation = withValidation(
  createUserSchema,
  async (req, data) => {
    // `data` is typed, validated, and sanitized
    console.log(data.name);  // TypeScript knows this exists
    console.log(data.email); // And is properly typed
    
    // Your logic here
    return NextResponse.json({ success: true });
  }
);

// =================================
// 4. SECURITY EVENT LOGGING
// =================================

import { 
  logSecurityEvent, 
  SecurityEventType,
  detectSuspiciousActivity,
  getSecurityAuditLog
} from '@/lib/security-monitoring';
import { getClientIp, getUserAgent } from '@/lib/api-middleware';

// Example 1: Log successful login
export async function handleLoginSuccess(req: NextRequest, userId: string) {
  await logSecurityEvent(
    userId,
    SecurityEventType.LOGIN_SUCCESS,
    { method: 'password', mfa_used: false },
    getClientIp(req),
    getUserAgent(req)
  );
}

// Example 2: Log failed login
export async function handleLoginFailure(req: NextRequest, email: string) {
  await logSecurityEvent(
    null,
    SecurityEventType.LOGIN_FAILURE,
    { email, reason: 'invalid_password' },
    getClientIp(req),
    getUserAgent(req)
  );
}

// Example 3: Detect suspicious activity
export async function checkForSuspiciousActivity(
  userId: string,
  ipAddress: string
) {
  const { suspicious, reason } = await detectSuspiciousActivity(userId, ipAddress);
  
  if (suspicious) {
    // Lock account
    await logSecurityEvent(
      userId,
      SecurityEventType.ACCOUNT_LOCKED,
      { reason },
      ipAddress,
      'system'
    );
    
    // Send alert
    console.error('🚨 Suspicious activity detected:', { userId, reason });
    
    return { blocked: true, reason };
  }
  
  return { blocked: false };
}

// Example 4: Get user's security audit log
export async function getUserSecurityLog(userId: string) {
  const logs = await getSecurityAuditLog(userId, 50);
  return logs;
}

// =================================
// 5. ACCOUNT LOCKOUT PROTECTION
// =================================

import { supabaseAdmin } from '@/utils/supabase-admin';

export async function checkAccountLockout(
  email: string,
  ipAddress: string
): Promise<{ locked: boolean; message?: string }> {
  const { data, error } = await supabaseAdmin.rpc('is_account_locked', {
    user_email: email,
    user_ip: ipAddress
  });

  if (error || data === true) {
    return {
      locked: true,
      message: 'Account temporarily locked. Try again in 15 minutes.'
    };
  }

  return { locked: false };
}

export async function logLoginAttempt(
  email: string,
  ipAddress: string,
  successful: boolean,
  userAgent: string
) {
  await supabaseAdmin.from('login_attempts').insert({
    email,
    ip_address: ipAddress,
    user_agent: userAgent,
    successful,
    attempted_at: new Date().toISOString()
  });
}

// Complete login flow with lockout
export async function POST_Login(req: NextRequest) {
  const { email, password } = await req.json();
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  // Check rate limiting
  const decision = await ajAuth.protect(req);
  if (decision.isDenied()) {
    return NextResponse.json(
      { error: 'Too many login attempts' },
      { status: 429 }
    );
  }

  // Check account lockout
  const lockout = await checkAccountLockout(email, ipAddress);
  if (lockout.locked) {
    return NextResponse.json(
      { error: lockout.message },
      { status: 429 }
    );
  }

  // Attempt login
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  // Log attempt
  await logLoginAttempt(email, ipAddress, !error, userAgent);

  if (error) {
    await logSecurityEvent(
      null,
      SecurityEventType.LOGIN_FAILURE,
      { email, reason: error.message },
      ipAddress,
      userAgent
    );
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // Log success
  await logSecurityEvent(
    data.user!.id,
    SecurityEventType.LOGIN_SUCCESS,
    { method: 'password' },
    ipAddress,
    userAgent
  );

  return NextResponse.json({ success: true });
}

// =================================
// 6. DATA ENCRYPTION
// =================================

export async function encryptSensitiveData(data: string) {
  const { data: encrypted } = await supabaseAdmin
    .rpc('encrypt_sensitive_data', { data });
  
  return encrypted;
}

export async function decryptSensitiveData(encryptedData: string) {
  const { data: decrypted } = await supabaseAdmin
    .rpc('decrypt_sensitive_data', { encrypted_data: encryptedData });
  
  return decrypted;
}

// Example: Store encrypted credit card last 4 digits
export async function storePaymentMethod(
  userId: string,
  last4: string
) {
  const encrypted = await encryptSensitiveData(last4);
  
  await supabaseAdmin
    .from('payment_methods')
    .insert({
      user_id: userId,
      last4_encrypted: encrypted
    });
}

// =================================
// 7. GDPR COMPLIANCE
// =================================

// Export user data
export async function POST_ExportData(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Gather all user data
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id);

  // Log the export
  await logSecurityEvent(
    user.id,
    SecurityEventType.DATA_EXPORT,
    { exported_tables: ['users', 'subscriptions'] },
    getClientIp(req),
    getUserAgent(req)
  );

  return NextResponse.json({
    personal_data: userData,
    subscriptions,
    exported_at: new Date().toISOString()
  });
}

// Request account deletion
export async function POST_DeleteAccount(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Schedule deletion (30-day grace period)
  await supabaseAdmin.from('data_retention_policy').insert({
    user_id: user.id,
    deletion_requested_at: new Date().toISOString(),
    deletion_scheduled_for: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });

  // Log request
  await logSecurityEvent(
    user.id,
    SecurityEventType.DATA_DELETION,
    { scheduled_for: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
    getClientIp(req),
    getUserAgent(req)
  );

  return NextResponse.json({
    message: 'Deletion scheduled. You have 30 days to cancel.',
    deletion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
}

// =================================
// 8. CUSTOM VALIDATION SCHEMAS
// =================================

// Scan request schema for pentesting SaaS
const scanRequestSchema = z.object({
  target_url: z.string().url().regex(/^https?:\/\//),
  scan_type: z.enum(['quick', 'full', 'custom']),
  backend_type: z.enum(['supabase', 'firebase', 'appwrite', 'unknown']).optional(),
  options: z.object({
    include_sql_injection: z.boolean().default(true),
    include_xss: z.boolean().default(true),
    include_rls_check: z.boolean().default(false)
  }).optional()
});

export const POST_StartScan = withValidation(
  scanRequestSchema,
  async (req, data) => {
    // Data is validated
    console.log('Scanning:', data.target_url);
    console.log('Type:', data.scan_type);
    
    // Create scan job
    const scanJob = await createScanJob({
      user_id: req.headers.get('user-id'),
      target_url: data.target_url,
      scan_type: data.scan_type,
      status: 'queued'
    });
    
    return NextResponse.json({ scan_id: scanJob.id });
  }
);

// =================================
// 9. SECURITY UTILITIES
// =================================

import { 
  detectSuspiciousPatterns,
  maskSensitiveData 
} from '@/utils/security';

// Check for malicious patterns
export function validateUserInput(input: string) {
  if (detectSuspiciousPatterns(input)) {
    return { 
      valid: false, 
      error: 'Input contains suspicious patterns' 
    };
  }
  return { valid: true };
}

// Mask data for logs
export function logSafelyExample(email: string, apiKey: string) {
  console.log({
    email: maskSensitiveData(email, 'email'),    // jo***@example.com
    apiKey: maskSensitiveData(apiKey, 'key')     // sk_test_****abcd
  });
}

// =================================
// 10. COMPLETE API ROUTE EXAMPLE
// =================================

// A fully secured API endpoint
export async function POST_FullExample(req: NextRequest) {
  // 1. Rate limiting
  const decision = await aj.protect(req);
  if (decision.isDenied()) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // 2. Validation & sanitization
  const schema = z.object({
    name: z.string().min(1).max(100),
    email: emailSchema
  });

  const body = await req.json();
  const result = validateAndSanitize(schema, body);
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // 3. Check authentication
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    await logSecurityEvent(
      null,
      SecurityEventType.UNAUTHORIZED_ACCESS,
      { endpoint: '/api/example' },
      getClientIp(req),
      getUserAgent(req)
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 4. Check for suspicious activity
  const { suspicious } = await detectSuspiciousActivity(user.id, getClientIp(req));
  if (suspicious) {
    return NextResponse.json(
      { error: 'Account locked due to suspicious activity' },
      { status: 403 }
    );
  }

  // 5. Your business logic
  const { data: userData } = await supabase
    .from('users')
    .update(result.data)
    .eq('id', user.id)
    .select()
    .single();

  // 6. Log success
  await logSecurityEvent(
    user.id,
    SecurityEventType.PROFILE_UPDATE,
    { updated_fields: Object.keys(result.data) },
    getClientIp(req),
    getUserAgent(req)
  );

  return NextResponse.json({ success: true, data: userData });
}

// =================================
// HELPER: Create client (for examples)
// =================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function createScanJob(data: any) {
  // Implementation would go here
  return Promise.resolve({ id: 'scan-123' });
}

// Add missing type
enum SecurityEventType {
  PROFILE_UPDATE = 'profile_update'
}
