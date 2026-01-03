'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

import { logger } from '@/lib/logger';

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
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  useEffect(() => {
    logger.info('[LoginPage] Config', {
        botUsername: botUsername ? `${botUsername.substring(0, 3)}...` : 'MISSING',
        supabaseUrl: supabaseUrl ? 'PRESENT' : 'MISSING',
        supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 5)}...` : 'MISSING',
    });
  }, [botUsername, supabaseUrl, supabaseAnonKey]);

  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    const handleMiniAppAuth = async (initData: string) => {
        if (isDevLoginLoading) return;
        
        setIsDevLoginLoading(true);
        try {
            logger.info('Sending initData to backend');
            const response = await fetch(`${supabaseUrl}/functions/v1/telegram-auth-miniapp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({ initData }),
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Server error ${response.status}: ${text}`);
            }
            
            const data = await response.json();
            
            if (data.session) {
                const { error } = await supabase.auth.setSession(data.session);
                if (error) throw error;
                router.push('/');
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            logger.error('Mini App Auth Error', errorMessage);
            alert('Ошибка входа через Mini App: ' + errorMessage);
        } finally {
            setIsDevLoginLoading(false);
        }
    };

    if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
            tg.ready();
            const initData = tg.initData;
            logger.info('[LoginPage] Detected Telegram Mini App', { 
                initData: initData ? 'PRESENT' : 'MISSING',
                platform: tg.platform 
            });
            
            if (tg.platform && tg.platform !== 'unknown') {
                setIsMiniApp(true);
            }

            if (initData) {
                handleMiniAppAuth(initData);
            }
        }
    }
  }, [supabaseUrl, router, isDevLoginLoading, supabaseAnonKey]);

  const [pollingToken, setPollingToken] = useState<string | null>(null);

  const startDeepLinkAuth = async () => {
      setIsDevLoginLoading(true);
      try {
          if (!supabaseAnonKey) throw new Error('Supabase Anon Key is missing');

          logger.info('Starting Deep Link Auth');
          const response = await fetch(`${supabaseUrl}/functions/v1/generate-auth-token`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                  'apikey': supabaseAnonKey,
              },
              body: JSON.stringify({ action: 'generate' }),
          });
          
          if (!response.ok) {
              const text = await response.text();
              throw new Error(`Server error ${response.status}: ${text}`);
          }

          const data = await response.json();
          if (!data.token) throw new Error('Failed to generate token');
          
          setPollingToken(data.token);
          
          const botLink = `https://t.me/${botUsername}?start=auth_${data.token}`;
          window.location.href = botLink;
      } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          logger.error('Error starting auth', errorMessage);
          alert('Error starting auth: ' + errorMessage);
          setIsDevLoginLoading(false);
      }
  };

  useEffect(() => {
      if (!pollingToken) return;
      
      const interval = setInterval(async () => {
          try {
              const res = await fetch(`${supabaseUrl}/functions/v1/generate-auth-token`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'poll', token: pollingToken }),
              });
              
              if (!res.ok) {
                  logger.warn(`Polling failed: ${res.status}`);
                  return;
              }

              const data = await res.json();
              
              if (data.status === 'success' && data.session) {
                  clearInterval(interval);
                  await supabase.auth.setSession(data.session);
                  router.push('/');
              }
          } catch (e) {
              logger.error('Polling error', e);
          }
      }, 2000);
      
      return () => clearInterval(interval);
  }, [pollingToken, supabaseUrl, router]);

  const handleDevLogin = async () => {
    setIsDevLoginLoading(true);
    try {
        // Unique email to avoid conflicts if needed, or just standard one
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

  const [, setClickCount] = useState(0);

  const handleLogoClick = () => {
    setClickCount(prev => {
        const newCount = prev + 1;
        if (newCount === 5) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).toggleDebug?.();
            return 0;
        }
        return newCount;
    });
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
        <h1 
            onClick={handleLogoClick}
            className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent cursor-pointer select-none"
        >
          Habbiter
        </h1>
        <p className="text-muted-foreground">
          Твой путь к лучшей версии себя
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm w-full max-w-sm">
        <h2 className="text-xl font-semibold mb-6">Вход</h2>
        
        {isMiniApp ? (
             <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Авторизация...</p>
             </div>
        ) : (
            <div className="flex flex-col gap-4 w-full">
                <Button 
                    className="w-full bg-[#24A1DE] hover:bg-[#208bbf] text-white font-semibold py-6"
                    onClick={startDeepLinkAuth}
                    disabled={isDevLoginLoading || !!pollingToken}
                >
                    {pollingToken ? (
                        <div className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                            Ожидание подтверждения...
                        </div>
                    ) : (
                        "Войти через Telegram"
                    )}
                </Button>
                
                {pollingToken && (
                    <p className="text-xs text-muted-foreground animate-pulse">
                        Мы открыли Telegram. Нажмите &quot;Запустить&quot; в боте.
                    </p>
                )}
            </div>
        )}
        
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
