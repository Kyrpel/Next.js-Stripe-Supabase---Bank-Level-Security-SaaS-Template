import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logSecurityEvent, SecurityEventType } from '@/lib/security-monitoring';
import { getClientIp, getUserAgent } from '@/lib/api-middleware';

/**
 * MFA Enrollment API Route
 * 
 * Enables TOTP (Time-based One-Time Password) authentication
 * Returns QR code and secret for authenticator apps (Google Authenticator, Authy, etc.)
 */

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    // Create Supabase client with user's session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Enroll MFA
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App'
    });

    if (error) {
      console.error('MFA enrollment error:', error);
      return NextResponse.json(
        { error: 'Failed to enroll MFA' },
        { status: 500 }
      );
    }

    // Log MFA enrollment
    await logSecurityEvent(
      user.id,
      SecurityEventType.MFA_ENABLED,
      { factor_type: 'totp', factor_id: data.id },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      factor_id: data.id,
      qr_code: data.totp.qr_code,
      secret: data.totp.secret,
      message: 'Scan the QR code with your authenticator app'
    });

  } catch (error) {
    console.error('MFA enrollment error:', error);
    return NextResponse.json(
      { error: 'An error occurred during MFA enrollment' },
      { status: 500 }
    );
  }
}
