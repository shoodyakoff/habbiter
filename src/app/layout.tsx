'use client';

import { Onest } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import AuthGuard from "@/components/auth/AuthGuard";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from "react";
import Script from "next/script";
import { DebugConsole } from "@/lib/logger";
import { initTelegramWebApp } from "@/lib/telegram";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ThemeScript } from "@/components/providers/ThemeScript";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
});

import { usePathname } from "next/navigation";

// ... existing imports

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${onest.variable} font-sans antialiased bg-background text-foreground flex flex-col min-h-screen`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthGuard>
              {!isLoginPage && <Header />}
              <main className={`flex-1 ${!isLoginPage ? 'pb-24 pt-4 px-4 container mx-auto max-w-md w-full' : ''}`}>
                {children}
              </main>
              {!isLoginPage && <BottomNav />}
            </AuthGuard>
            <DebugConsole />
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
