'use client';

import { Onest } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import AuthGuard from "@/components/auth/AuthGuard";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from "react";
import Script from "next/script";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="ru">
      <head>
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body
        className={`${onest.variable} font-sans antialiased bg-background text-foreground flex flex-col min-h-screen`}
      >
        <QueryClientProvider client={queryClient}>
          <AuthGuard>
            <Header />
            <main className="flex-1 pb-24 pt-4 px-4 container mx-auto">
              {children}
            </main>
            <BottomNav />
          </AuthGuard>
        </QueryClientProvider>
      </body>
    </html>
  );
}
