'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isDevLoginLoading, setIsDevLoginLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  // authUrl is no longer needed for data-onauth flow
  
  useEffect(() => {
    // Debug logging for environment
    console.log('[LoginPage] Config:', {
        botUsername: botUsername ? `${botUsername.substring(0, 3)}...` : 'MISSING',
        supabaseUrl: supabaseUrl ? 'PRESENT' : 'MISSING',
    });
  }, [botUsername, supabaseUrl]);

  useEffect(() => {
    // Check if running in Telegram Mini App
    // We check for initData AND if we are inside the iframe/webview
    if (typeof window !== 'undefined') {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
            tg.ready();
            const initData = tg.initData;
            console.log('[LoginPage] Detected Telegram Mini App', { 
                initData: initData ? 'PRESENT' : 'MISSING',
                platform: tg.platform 
            });
            
            if (initData) {
                handleMiniAppAuth(initData);
            }
        }
    }
  }, []);

  const handleMiniAppAuth = async (initData: string) => {
    setIsDevLoginLoading(true);
    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/telegram-auth-miniapp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ initData }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to authenticate via Mini App');
        }
        
        if (data.session) {
            const { error } = await supabase.auth.setSession(data.session);
            if (error) throw error;
            router.push('/');
        }
    } catch (e: any) {
        console.error('Mini App Auth Error:', e);
        // Fallback to widget if auto-login fails is usually not needed but good to keep UI visible
    } finally {
        setIsDevLoginLoading(false);
    }
  };

  const handleTelegramAuth = async (user: any) => {
      console.log('Telegram Auth Data:', user);
      setIsDevLoginLoading(true); // Reuse loading state or create new one
      
      try {
          // Send data to backend for verification and session creation
          const response = await fetch(`${supabaseUrl}/functions/v1/telegram-auth`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(user),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
              throw new Error(data.error || 'Failed to authenticate');
          }
          
          if (data.session) {
              // Set Supabase session
              const { error } = await supabase.auth.setSession(data.session);
              if (error) throw error;
              
              console.log('Session set successfully, redirecting...');
              router.push('/');
          } else {
              throw new Error('No session returned from backend');
          }
      } catch (e: any) {
          console.error('Auth Error:', e);
          alert('Ошибка авторизации: ' + e.message);
      } finally {
          setIsDevLoginLoading(false);
      }
  };

  const handleDevLogin = async () => {
    setIsDevLoginLoading(true);
    try {
        const email = `test_${Date.now()}@example.com`; // Unique email to avoid conflicts if needed, or just standard one
        // Actually, let's stick to one dev user. 
        // The error "Email address is invalid" is weird for 'test@example.com'.
        // It might be a Supabase config issue (e.g. email provider disabled).
        // Let's try a more real-looking email just in case.
        const devEmail = 'habbiter_dev_user@gmail.com'; 
        
        const { error } = await supabase.auth.signInWithPassword({
            email: devEmail,
            password: 'password123'
        });
        
        if (error) {
            console.log('Login failed, trying signup:', error.message);
            // Try to sign up if login fails
            const { error: signUpError } = await supabase.auth.signUp({
                email: devEmail,
                password: 'password123',
                options: {
                    data: {
                        first_name: 'Dev',
                        last_name: 'User',
                        username: 'dev_user',
                        photo_url: '',
                        telegram_id: 999999999
                    }
                }
            });
            
            if (signUpError) {
                alert('Ошибка входа (Dev): ' + signUpError.message);
            } else {
                // Check if session was created immediately (if email confirm is off)
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    router.push('/');
                } else {
                    alert('Тестовый пользователь создан! Если у вас включено подтверждение почты в Supabase, отключите его в Authentication -> Providers -> Email -> Confirm email.');
                }
            }
        } else {
            router.push('/');
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsDevLoginLoading(false);
    }
  };



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
        
        <TelegramLoginButton 
          botUsername={botUsername} 
          onAuth={handleTelegramAuth}
        />
        
        {/* Helper text for localhost */}
        {process.env.NODE_ENV === 'development' && (
             <div className="mt-4 p-4 bg-yellow-500/10 text-yellow-600 rounded-lg text-xs text-left">
                <p className="font-bold mb-1">🔧 Режим разработки:</p>
                <p>Если виджет не отображается:</p>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Проверьте, что домен (localhost) добавлен в BotFather (/setdomain) — <b>не работает для localhost</b></li>
                    <li>Используйте <b>ngrok</b> или задеплойте на GitHub Pages</li>
                    <li>Убедитесь, что переменные окружения (.env.local) настроены корректно</li>
                </ul>

                <div className="mt-4 pt-4 border-t border-yellow-500/20">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30 text-yellow-700"
                        onClick={handleDevLogin}
                        disabled={isDevLoginLoading}
                    >
                        {isDevLoginLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserCircle className="w-4 h-4 mr-2" />}
                        Тестовый вход (Dev)
                    </Button>
                    <p className="text-[10px] mt-1 opacity-80">Создаст user: habbiter_dev_user@gmail.com</p>
                </div>
             </div>
        )}

        <p className="text-xs text-muted-foreground mt-6">
          Авторизуясь, вы соглашаетесь с условиями использования и политикой конфиденциальности.
        </p>
      </div>
    </div>
  );
}
