'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSubscriptionStatus } from '@/features/auth/hooks/useSubscriptionStatus';
import { Loader2 } from 'lucide-react';

const PUBLIC_ROUTES = ['/login', '/subscribe'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { status, isLoading: subLoading } = useSubscriptionStatus();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading || subLoading) return;

    // Not authenticated → redirect to login
    if (!user && !PUBLIC_ROUTES.includes(pathname)) {
      router.push('/login');
      return;
    }

    // Authenticated on login page → redirect home
    if (user && pathname === '/login') {
      router.push('/');
      return;
    }

    // Check subscription status (only if authenticated and not on public routes)
    if (user && !PUBLIC_ROUTES.includes(pathname) && status) {
      // If cache says subscribed and not expired → trust it (no API call)
      if (status.isSubscribed && !status.needsCheck) {
        return; // All good!
      }

      // If cache expired (needsCheck: true) or not subscribed → redirect to /subscribe
      if (!status.isSubscribed || status.needsCheck) {
        router.push('/subscribe');
      }
    }
  }, [user, authLoading, status, subLoading, pathname, router]);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
