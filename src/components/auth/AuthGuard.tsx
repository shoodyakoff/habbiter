'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const PUBLIC_ROUTES = ['/login', '/subscribe'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);

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
        // We can check local user metadata or make a quick DB call
        // Ideally, is_subscribed should be in user_metadata or we fetch it
        // For now let's assume we need to fetch it from DB or rely on metadata if we synced it
        
        // Let's fetch from public users table to be sure
        const { data } = await supabase
            .from('users')
            .select('is_subscribed')
            .eq('id', user.id)
            .single();
            
        if (data && !data.is_subscribed && pathname !== '/subscribe') {
            router.push('/subscribe');
        }
        setIsCheckingSubscription(false);
      };
      
      checkSub();
    } else {
        const timer = setTimeout(() => setIsCheckingSubscription(false), 0);
        return () => clearTimeout(timer);
    }
  }, [user, loading, pathname, router]);

  if (loading || (user && isCheckingSubscription && !PUBLIC_ROUTES.includes(pathname))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
