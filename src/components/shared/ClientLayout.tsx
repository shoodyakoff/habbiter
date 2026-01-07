'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/shared/Header';
import { BottomNav } from '@/components/shared/BottomNav';
import AuthGuard from '@/components/auth/AuthGuard';
import { DebugConsole } from '@/lib/logger';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthGuard>
          {!isLoginPage && <Header />}
          <main
            className={`flex-1 ${
              !isLoginPage
                ? 'pb-24 pt-4 px-4 container mx-auto max-w-md w-full'
                : ''
            }`}
          >
            {children}
          </main>
          {!isLoginPage && <BottomNav />}
        </AuthGuard>
        <DebugConsole />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
