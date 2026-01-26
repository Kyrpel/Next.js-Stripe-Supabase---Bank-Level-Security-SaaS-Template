import { NextRequest, NextResponse } from 'next/server';
import { ajAuth } from '@/lib/arcjet';
import { supabaseAdmin } from '@/utils/supabase-admin';
import { logSecurityEvent, SecurityEventType } from '@/lib/security-monitoring';
import { getClientIp, getUserAgent } from '@/lib/api-middleware';
import { createClient } from '@supabase/supabase-js';

/**
 * Secure Login API Route
 * 
 * Features:
 * - Rate limiting (5 attempts per 5 minutes)
 * - Account lockout (5 failed attempts = 15 min lock)
 * - Security event logging
 * - IP and user agent tracking
 */

async function checkAccountLockout(
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
      message: 'Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.'
    };
  }

  return { locked: false };
}

async function logLoginAttempt(
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

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    // 1. Rate limiting check
    const decision = await ajAuth.protect(req);
    if (decision.isDenied()) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: '5 minutes'
        },
        { status: 429 }
      );
    }

    // 2. Parse request body
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // 3. Check account lockout
    const lockout = await checkAccountLockout(email, ipAddress);
    if (lockout.locked) {
      await logSecurityEvent(
        null,
        SecurityEventType.ACCOUNT_LOCKED,
        { email, reason: 'Too many failed attempts' },
        ipAddress,
        userAgent
      );

      return NextResponse.json(
        { error: lockout.message },
        { status: 429 }
      );
    }

    // 4. Attempt login with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // 5. Log the attempt
    await logLoginAttempt(email, ipAddress, !error, userAgent);

    // 6. Handle login failure
    if (error) {
      await logSecurityEvent(
        null,
        SecurityEventType.LOGIN_FAILURE,
        { email, reason: error.message },
        ipAddress,
        userAgent
      );

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 7. Log successful login
    await logSecurityEvent(
      data.user!.id,
      SecurityEventType.LOGIN_SUCCESS,
      { method: 'password', mfa_used: false },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      user: {
        id: data.user!.id,
        email: data.user!.email
      },
      session: data.session
    });

  } catch (error) {
    console.error('Login error:', error);
    
    await logSecurityEvent(
      null,
      SecurityEventType.LOGIN_FAILURE,
      { error: 'Internal error during login' },
      ipAddress,
      userAgent
    );

    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
