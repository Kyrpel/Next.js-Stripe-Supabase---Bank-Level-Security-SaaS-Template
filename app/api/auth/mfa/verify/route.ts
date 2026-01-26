import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logSecurityEvent, SecurityEventType } from '@/lib/security-monitoring';
import { getClientIp, getUserAgent } from '@/lib/api-middleware';

/**
 * MFA Verification API Route
 * 
 * Verifies TOTP code from authenticator app
 * Completes MFA enrollment
 */

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    const { factorId, code } = await req.json();

    if (!factorId || !code) {
      return NextResponse.json(
        { error: 'Factor ID and verification code are required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create challenge
    const { data: challengeData, error: challengeError } = 
      await supabase.auth.mfa.challenge({
        factorId
      });

    if (challengeError) {
      console.error('MFA challenge error:', challengeError);
      return NextResponse.json(
        { error: 'Failed to create MFA challenge' },
        { status: 500 }
      );
    }

    // Verify code
    const { data: verifyData, error: verifyError } = 
      await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });

    if (verifyError) {
      await logSecurityEvent(
        user.id,
        SecurityEventType.LOGIN_FAILURE,
        { reason: 'Invalid MFA code', factor_id: factorId },
        ipAddress,
        userAgent
      );

      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Log successful MFA verification
    await logSecurityEvent(
      user.id,
      SecurityEventType.LOGIN_SUCCESS,
      { method: 'mfa', mfa_used: true, factor_id: factorId },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'MFA verified successfully',
      access_token: verifyData.access_token,
      refresh_token: verifyData.refresh_token
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during MFA verification' },
      { status: 500 }
    );
  }
}
