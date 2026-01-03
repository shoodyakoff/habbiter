'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Load Telegram Widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    
    if (!botUsername || !supabaseUrl) {
        console.error('Telegram Bot Username or Supabase URL missing');
        return;
    }

    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-auth-url', `${supabaseUrl}/functions/v1/telegram-auth`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    const container = document.getElementById('telegram-login-container');
    if (container) {
        container.innerHTML = '';
        container.appendChild(script);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          Habbiter
        </h1>
        <p className="text-muted-foreground">
          Твой путь к лучшей версии себя
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm w-full max-w-sm">
        <h2 className="text-xl font-semibold mb-6">Вход</h2>
        <div id="telegram-login-container" className="flex justify-center min-h-[40px]" />
        <p className="text-xs text-muted-foreground mt-6">
          Авторизуясь, вы соглашаетесь с условиями использования и политикой конфиденциальности.
        </p>
      </div>
    </div>
  );
}
