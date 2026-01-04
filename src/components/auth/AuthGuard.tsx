'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const PUBLIC_ROUTES = ['/login', '/subscribe'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const checkInProgress = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!user && !PUBLIC_ROUTES.includes(pathname)) {
      router.push('/login');
      return;
    }

    if (user && pathname === '/login') {
      router.push('/');
      return;
    }

    if (user && !PUBLIC_ROUTES.includes(pathname)) {
      // Check subscription status
      const checkSub = async () => {
        if (checkInProgress.current) return;
        
        // 0. Check JWT metadata (INSTANT CHECK)
        // This is the fastest way - no DB call, no API call
        if (user.app_metadata?.is_subscribed === true) {
            console.log('[AuthGuard] Subscribed via JWT metadata');
            setIsCheckingSubscription(false);
            return;
        }

        checkInProgress.current = true;

        try {
            // 1. Check DB first (fast)
            const { data } = await supabase
                .from('users')
                .select('is_subscribed')
                .eq('id', user.id)
                .single();
                
            if (data?.is_subscribed) {
                setIsCheckingSubscription(false);
                checkInProgress.current = false;
                return;
            }

            // 2. If DB says false, double check with Edge Function (Source of Truth)
            const token = session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;
            
            if (!token) {
                 checkInProgress.current = false;
                 return;
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-subscription`, {
                 method: 'POST',
                 headers: {
                     'Authorization': `Bearer ${token}`
                 }
             });
             
             const edgeData = await res.json();
             console.log('[AuthGuard] Check result:', edgeData);
             
             if (edgeData.isSubscribed) {
                 // User is actually subscribed!
                 setIsCheckingSubscription(false);
             } else {
                 // Truly not subscribed
                 console.warn('[AuthGuard] Subscription check failed', edgeData);
                 if (pathname !== '/subscribe') {
                     router.push('/subscribe');
                 }
                 setIsCheckingSubscription(false);
             }
         } catch (error) {
             console.error('[AuthGuard] Check error', error);
             if (pathname !== '/subscribe') {
                 router.push('/subscribe');
             }
             setIsCheckingSubscription(false);
         } finally {
             checkInProgress.current = false;
         }
      };
      
      checkSub();
    } else {
        setIsCheckingSubscription(false);
    }
  }, [user, loading, pathname, router, session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
