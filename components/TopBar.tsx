'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { Shield } from 'lucide-react';
// import { supabase } from '@/utils/supabase';

// TopBar component handles user profile display and navigation
export default function TopBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { subscription, isLoading: isLoadingSubscription } = useSubscription();
  const { isInTrial } = useTrialStatus();

  // State for tracking logout process
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle user logout with error handling and loading state
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      setIsDropdownOpen(false);
      setIsLoggingOut(false);
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to sign out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="w-full bg-[#161B22] border-b border-white/10">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-3">
        <Link href="/" className="text-md sm:text-lg font-semibold text-[#E5E7EB] flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Shield className="w-6 h-6 text-[#3B82F6]" />
          <span className="font-rajdhani uppercase font-bold tracking-wide">SecureStack</span>
        </Link>

        <div className="flex items-center gap-4">
          {!user ? (
            <>
              {/* Show login button for unauthenticated users */}
              <Link
                href="/login"
                className="px-6 py-2 text-sm font-medium text-white bg-[#1E3A5F] hover:bg-[#2C5282] rounded-lg transition-colors"
              >
                Sign in
              </Link>
            </>
          ) : (
            // Show subscription and profile for authenticated users
            <>
              {!isLoadingSubscription && (!isInTrial) && (
                !subscription || 
                subscription.status === 'canceled' || 
                (subscription.cancel_at_period_end && new Date(subscription.current_period_end) > new Date())
              ) && (
                <button
                  onClick={() => router.push('/profile')}
                  className="hidden sm:block px-6 py-2 bg-[#1E3A5F] hover:bg-[#2C5282] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  View Subscription
                </button>
              )}

              {!isLoadingSubscription && (
                subscription || isInTrial
              ) && pathname !== '/dashboard' && (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="hidden sm:block px-6 py-2 bg-[#1E3A5F] hover:bg-[#2C5282] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isInTrial ? "Start Free Trial" : "Dashboard"}
                </button>
              )}
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-[#1E3A5F] rounded-lg flex items-center justify-center text-white font-medium">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#161B22] rounded-lg shadow-xl py-1 z-[60] border border-white/10">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-[#E5E7EB] hover:bg-white/5"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsDropdownOpen(false);
                        window.location.href = '/profile';
                      }}
                    >
                      Profile & Subscription
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 disabled:opacity-50"
                    >
                      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 