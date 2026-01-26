import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logSecurityEvent, SecurityEventType } from '@/lib/security-monitoring';
import { getClientIp, getUserAgent } from '@/lib/api-middleware';

/**
 * GDPR Data Export API Route
 * 
 * Exports all user data for GDPR compliance
 * - Personal data from users table
 * - Subscriptions
 * - Security events (audit log)
 * - Any other user-related data
 */

export async function POST(req: NextRequest) {
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
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Gather all user data
    const [
      { data: userData },
      { data: userPreferences },
      { data: userTrials },
      { data: subscriptions },
      { data: securityEvents }
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('user_preferences').select('*').eq('user_id', user.id).single(),
      supabase.from('user_trials').select('*').eq('user_id', user.id).single(),
      supabase.from('subscriptions').select('*').eq('user_id', user.id),
      supabase.from('security_events').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
    ]);

    // Log the data export
    await logSecurityEvent(
      user.id,
      SecurityEventType.DATA_EXPORT,
      { 
        exported_tables: ['users', 'user_preferences', 'user_trials', 'subscriptions', 'security_events'],
        record_count: {
          subscriptions: subscriptions?.length || 0,
          security_events: securityEvents?.length || 0
        }
      },
      ipAddress,
      userAgent
    );

    // Return all user data
    return NextResponse.json({
      success: true,
      exported_at: new Date().toISOString(),
      data: {
        personal_information: {
          id: userData?.id,
          email: userData?.email,
          created_at: userData?.created_at,
          updated_at: userData?.updated_at
        },
        preferences: userPreferences,
        trial_information: userTrials,
        subscriptions: subscriptions?.map(sub => ({
          id: sub.id,
          status: sub.status,
          price_id: sub.price_id,
          created_at: sub.created_at,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end
        })),
        security_events: securityEvents?.map(event => ({
          event_type: event.event_type,
          created_at: event.created_at,
          ip_address: event.ip_address,
          metadata: event.metadata
        }))
      },
      message: 'Your data export is ready. This includes all personal information we store about you.'
    });

  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { error: 'An error occurred during data export' },
      { status: 500 }
    );
  }
}
