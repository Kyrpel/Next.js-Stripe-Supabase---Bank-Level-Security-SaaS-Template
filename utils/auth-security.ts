import { supabaseAdmin } from './supabase-admin';
import { logSecurityEvent, SecurityEventType } from '@/lib/security-monitoring';

/**
 * Authentication Security Utilities
 * 
 * Consolidated functions for account lockout protection,
 * login attempt tracking, and authentication security.
 */

export interface AccountLockoutResult {
  locked: boolean;
  message?: string;
  remainingAttempts?: number;
}

export interface LoginAttemptData {
  email: string;
  ipAddress: string;
  userAgent: string;
  successful: boolean;
}

/**
 * Check if account is locked due to failed login attempts
 * 
 * Locks account after 5 failed attempts for 15 minutes
 */
export async function checkAccountLockout(
  email: string,
  ipAddress: string
): Promise<AccountLockoutResult> {
  try {
    const { data, error } = await supabaseAdmin.rpc('is_account_locked', {
      user_email: email,
      user_ip: ipAddress
    });

    if (error) {
      console.error('Account lockout check error:', error);
      return { locked: false };
    }

    if (data === true) {
      return {
        locked: true,
        message: 'Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.'
      };
    }

    // Get remaining attempts
    const { data: attempts } = await supabaseAdmin
      .from('login_attempts')
      .select('*')
      .eq('email', email)
      .eq('ip_address', ipAddress)
      .eq('successful', false)
      .gte('attempted_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

    const failedCount = attempts?.length || 0;
    const remainingAttempts = Math.max(0, 5 - failedCount);

    return {
      locked: false,
      remainingAttempts
    };
  } catch (error) {
    console.error('Account lockout check error:', error);
    return { locked: false };
  }
}

/**
 * Log a login attempt (successful or failed)
 */
export async function logLoginAttempt(data: LoginAttemptData): Promise<void> {
  try {
    await supabaseAdmin.from('login_attempts').insert({
      email: data.email,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      successful: data.successful,
      attempted_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

/**
 * Clear failed login attempts for a user (after successful login)
 */
export async function clearFailedAttempts(
  email: string,
  ipAddress: string
): Promise<void> {
  try {
    await supabaseAdmin
      .from('login_attempts')
      .delete()
      .eq('email', email)
      .eq('ip_address', ipAddress)
      .eq('successful', false);
  } catch (error) {
    console.error('Failed to clear login attempts:', error);
  }
}

/**
 * Get failed login attempts count
 */
export async function getFailedAttemptsCount(
  email: string,
  ipAddress: string,
  windowMinutes: number = 15
): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .eq('ip_address', ipAddress)
      .eq('successful', false)
      .gte('attempted_at', new Date(Date.now() - windowMinutes * 60 * 1000).toISOString());

    if (error) {
      console.error('Failed to get attempts count:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Failed to get attempts count:', error);
    return 0;
  }
}

/**
 * Check if IP address is suspicious (too many different accounts)
 */
export async function checkSuspiciousIP(ipAddress: string): Promise<boolean> {
  try {
    // Check if this IP has failed login attempts for multiple different accounts
    const { data } = await supabaseAdmin
      .from('login_attempts')
      .select('email')
      .eq('ip_address', ipAddress)
      .eq('successful', false)
      .gte('attempted_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    if (!data) return false;

    // If more than 10 different emails from same IP in last hour = suspicious
    const uniqueEmails = new Set(data.map(d => d.email));
    return uniqueEmails.size > 10;
  } catch (error) {
    console.error('Failed to check suspicious IP:', error);
    return false;
  }
}

/**
 * Get recent login history for a user
 */
export async function getLoginHistory(
  email: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('login_attempts')
      .select('*')
      .eq('email', email)
      .order('attempted_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get login history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get login history:', error);
    return [];
  }
}

/**
 * Alert on suspicious login patterns
 */
export async function checkSuspiciousLogin(
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<{ suspicious: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  try {
    // Check 1: New IP address
    const { data: recentLogins } = await supabaseAdmin
      .from('security_events')
      .select('ip_address')
      .eq('user_id', userId)
      .eq('event_type', SecurityEventType.LOGIN_SUCCESS)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(20);

    if (recentLogins) {
      const knownIPs = new Set(recentLogins.map(l => l.ip_address));
      if (!knownIPs.has(ipAddress) && knownIPs.size > 0) {
        reasons.push('Login from new IP address');
      }
    }

    // Check 2: Multiple IPs in short time
    const { data: recentEvents } = await supabaseAdmin
      .from('security_events')
      .select('ip_address')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (recentEvents) {
      const uniqueIPs = new Set(recentEvents.map(e => e.ip_address));
      if (uniqueIPs.size > 3) {
        reasons.push('Multiple IP addresses in short time');
      }
    }

    // Check 3: Suspicious IP
    const suspiciousIP = await checkSuspiciousIP(ipAddress);
    if (suspiciousIP) {
      reasons.push('IP address has suspicious activity');
    }

    return {
      suspicious: reasons.length > 0,
      reasons
    };

  } catch (error) {
    console.error('Failed to check suspicious login:', error);
    return { suspicious: false, reasons: [] };
  }
}
