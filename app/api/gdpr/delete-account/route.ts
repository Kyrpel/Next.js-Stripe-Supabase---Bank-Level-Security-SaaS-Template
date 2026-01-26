import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/utils/supabase-admin';
import { logSecurityEvent, SecurityEventType } from '@/lib/security-monitoring';
import { getClientIp, getUserAgent } from '@/lib/api-middleware';

/**
 * GDPR Account Deletion API Route
 * 
 * Schedules account deletion with 30-day grace period
 * GDPR "Right to be Forgotten" compliance
 * 
 * Process:
 * 1. User requests deletion
 * 2. Account is scheduled for deletion in 30 days
 * 3. User can cancel within 30 days
 * 4. After 30 days, data is anonymized (not hard-deleted to maintain audit trail)
 */

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    const { confirmPassword } = await req.json();

    // Create Supabase client
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

    // Optional: Verify password before deletion (recommended)
    if (confirmPassword) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: confirmPassword
      });

      if (verifyError) {
        return NextResponse.json(
          { error: 'Invalid password. Please confirm your password to delete your account.' },
          { status: 401 }
        );
      }
    }

    // Check if deletion already scheduled
    const { data: existingRequest } = await supabaseAdmin
      .from('data_retention_policy')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingRequest && !existingRequest.deleted_at) {
      return NextResponse.json({
        success: false,
        message: 'Account deletion is already scheduled',
        scheduled_for: existingRequest.deletion_scheduled_for
      });
    }

    // Calculate deletion date (30 days from now)
    const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Schedule deletion
    await supabaseAdmin
      .from('data_retention_policy')
      .upsert({
        user_id: user.id,
        deletion_requested_at: new Date().toISOString(),
        deletion_scheduled_for: deletionDate.toISOString(),
        deletion_reason: 'User requested'
      });

    // Log the deletion request
    await logSecurityEvent(
      user.id,
      SecurityEventType.DATA_DELETION,
      { 
        scheduled_for: deletionDate.toISOString(),
        grace_period_days: 30 
      },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'Account deletion has been scheduled',
      deletion_scheduled_for: deletionDate.toISOString(),
      grace_period: '30 days',
      instructions: [
        'Your account will be deleted in 30 days',
        'You can cancel this request anytime within 30 days by logging in',
        'After 30 days, your data will be permanently anonymized',
        'Audit logs will be retained for compliance but with anonymized identifiers'
      ]
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your deletion request' },
      { status: 500 }
    );
  }
}

/**
 * Cancel scheduled deletion (GET request)
 */
export async function GET(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
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

    // Remove deletion request
    await supabaseAdmin
      .from('data_retention_policy')
      .delete()
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // Log cancellation
    await logSecurityEvent(
      user.id,
      SecurityEventType.DATA_DELETION,
      { action: 'cancelled' },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'Account deletion has been cancelled. Your account will remain active.'
    });

  } catch (error) {
    console.error('Deletion cancellation error:', error);
    return NextResponse.json(
      { error: 'An error occurred while cancelling deletion' },
      { status: 500 }
    );
  }
}
