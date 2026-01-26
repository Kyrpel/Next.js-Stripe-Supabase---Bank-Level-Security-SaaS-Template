import { supabaseAdmin } from '@/utils/supabase-admin';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  ACCOUNT_LOCKED = 'account_locked',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGE = 'password_change',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  PAYMENT_CHANGE = 'payment_change',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

interface SecurityEventMetadata {
  [key: string]: any;
}

/**
 * Log security events for audit trail and threat detection
 */
export async function logSecurityEvent(
  userId: string | null,
  eventType: SecurityEventType,
  metadata: SecurityEventMetadata,
  ipAddress: string,
  userAgent: string
) {
  try {
    await supabaseAdmin.from('security_events').insert({
      user_id: userId,
      event_type: eventType,
      metadata,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    });

    // Alert on critical events
    if (shouldAlert(eventType)) {
      await alertSecurityTeam(userId, eventType, metadata);
    }

    // Log to console for monitoring systems
    console.log(`[SECURITY] ${eventType}`, {
      userId,
      ipAddress,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Determine if event requires immediate alerting
 */
function shouldAlert(eventType: SecurityEventType): boolean {
  const criticalEvents = [
    SecurityEventType.SUSPICIOUS_ACTIVITY,
    SecurityEventType.ACCOUNT_LOCKED,
    SecurityEventType.UNAUTHORIZED_ACCESS,
    SecurityEventType.DATA_DELETION,
  ];
  return criticalEvents.includes(eventType);
}

/**
 * Send alert to security team
 */
async function alertSecurityTeam(
  userId: string | null,
  eventType: SecurityEventType,
  metadata: SecurityEventMetadata
) {
  console.error('🚨 SECURITY ALERT:', {
    userId,
    eventType,
    metadata,
    timestamp: new Date().toISOString(),
  });

  // TODO: Integrate with your alerting system
  // Options:
  // 1. Slack webhook
  // 2. Email via Resend
  // 3. PagerDuty
  // 4. Discord webhook
  // 5. Sentry alert

  // Example Slack webhook:
  // if (process.env.SLACK_SECURITY_WEBHOOK_URL) {
  //   await fetch(process.env.SLACK_SECURITY_WEBHOOK_URL, {
  //     method: 'POST',
  //     body: JSON.stringify({
  //       text: `🚨 Security Alert: ${eventType}`,
  //       blocks: [
  //         {
  //           type: 'section',
  //           text: {
  //             type: 'mrkdwn',
  //             text: `*Event:* ${eventType}\n*User ID:* ${userId}\n*Metadata:* \`\`\`${JSON.stringify(metadata, null, 2)}\`\`\``
  //           }
  //         }
  //       ]
  //     })
  //   });
  // }
}

/**
 * Check for suspicious activity patterns
 */
export async function detectSuspiciousActivity(
  userId: string,
  ipAddress: string
): Promise<{ suspicious: boolean; reason?: string }> {
  // Check for multiple failed login attempts
  const { data: failedLogins } = await supabaseAdmin
    .from('security_events')
    .select('*')
    .eq('user_id', userId)
    .eq('event_type', SecurityEventType.LOGIN_FAILURE)
    .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

  if (failedLogins && failedLogins.length >= 5) {
    return { suspicious: true, reason: 'Multiple failed login attempts' };
  }

  // Check for access from multiple IPs in short time
  const { data: recentEvents } = await supabaseAdmin
    .from('security_events')
    .select('ip_address')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if (recentEvents) {
    const uniqueIps = new Set(recentEvents.map(e => e.ip_address));
    if (uniqueIps.size > 3) {
      return { suspicious: true, reason: 'Multiple IP addresses in short time' };
    }
  }

  return { suspicious: false };
}

/**
 * Get security audit log for a user
 */
export async function getSecurityAuditLog(
  userId: string,
  limit: number = 50
) {
  const { data, error } = await supabaseAdmin
    .from('security_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch security audit log:', error);
    return [];
  }

  return data;
}
