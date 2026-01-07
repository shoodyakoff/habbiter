'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2, UserCircle, Send, Check, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { motion, Variants } from 'framer-motion';
import { getTextColorForHabit } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { BookOpen, Drop, Alien, Dna } from '@phosphor-icons/react';

// Mock Habit Card Component for Login Page
const MockHabitCard = ({ 
    name, 
    color, 
    icon: Icon, 
    streak, 
    completed = false,
    className 
}: { 
    name: string; 
    color: string; 
    icon: React.ElementType; 
    streak: number; 
    completed?: boolean;
    className?: string;
}) => {
    const textColorClass = getTextColorForHabit(color);
    const isLightBg = textColorClass === 'text-black';

    return (
        <div 
            className={cn(
                "relative h-28 w-full rounded-2xl p-4 flex flex-col justify-between shadow-sm",
                className
            )}
            style={{ backgroundColor: `var(--color-habit-${color})` }}
        >
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className={cn("p-0", textColorClass)}>
                    <Icon size={24} strokeWidth={2.5} />
                </div>

                <div className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors",
                    isLightBg ? "border-black/20" : "border-white/40",
                    completed && (isLightBg ? "bg-black border-black" : "bg-white border-white")
                )}>
                     {completed && <Check size={16} strokeWidth={4} className={isLightBg ? "text-white" : "text-black"} />}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto flex justify-between items-end w-full">
                <h3 className={cn("font-semibold text-base leading-tight line-clamp-2 text-left mr-2", textColorClass)}>
                    {name}
                </h3>
                
                {streak > 0 && (
                    <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md bg-black/10 backdrop-blur-sm shrink-0",
                        textColorClass
                    )}>
                        <Flame size={14} fill="currentColor" className={isLightBg ? "text-red-600" : "text-orange-300"} />
                        <span className="text-xs font-medium">{streak} дн</span>
                    </div>
                )}
            </div>
        </div>
    );
};

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
  
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    logger.info('[LoginPage] Config', {
        botUsername: botUsername ? `${botUsername.substring(0, 3)}...` : 'MISSING',
        supabaseUrl: supabaseUrl ? 'PRESENT' : 'MISSING',
        supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 5)}...` : 'MISSING',
    });

    if (supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ')) {
        const error = 'Некорректный NEXT_PUBLIC_SUPABASE_ANON_KEY. Он должен начинаться с "eyJ" (JWT токен). Вы, вероятно, используете API Key Reference ID.';
        logger.error(error);
        setConfigError(error);
    }
  }, [botUsername, supabaseUrl, supabaseAnonKey]);

  const [isMiniApp, setIsMiniApp] = useState(false);
  const authAttempted = useRef(false);

  useEffect(() => {
    const handleMiniAppAuth = async (initData: string) => {
        if (authAttempted.current) return;
        authAttempted.current = true;
        
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
            authAttempted.current = false; // Allow retry on error? Maybe not.
        } finally {
            setIsDevLoginLoading(false);
        }
    };

    if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tg = (window as any).Telegram?.WebApp;
        if (tg && tg.initData) {
            tg.ready();
            const initData = tg.initData;

            // Only treat as Mini App if we have actual initData from Telegram
            logger.info('[LoginPage] Detected Telegram Mini App with initData', {
                platform: tg.platform
            });

            setIsMiniApp(true);
            handleMiniAppAuth(initData);
        } else if (tg) {
            // Telegram WebApp SDK is present but no initData (opened in browser)
            logger.info('[LoginPage] Telegram WebApp SDK detected but no initData (browser mode)');
        }
    }
  }, [supabaseUrl, router, supabaseAnonKey]);

  const [pollingToken, setPollingToken] = useState<string | null>(null);
  const [showMobileFallback, setShowMobileFallback] = useState(false);
  const [botLink, setBotLink] = useState<string>('');

  // Detect if we're in Safari or Telegram in-app browser
  const isInAppBrowser = () => {
      if (typeof window === 'undefined') return false;
      const ua = navigator.userAgent || navigator.vendor;

      // Check for Telegram in-app browser
      const isTelegramBrowser = ua.includes('Telegram');

      // Check for Safari (but not Chrome on iOS which also includes Safari in UA)
      const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);

      // Check for iOS in general (includes Safari, Chrome on iOS, etc)
      const isIOS = /iPhone|iPad|iPod/.test(ua);

      logger.info('[LoginPage] Browser detection', { isTelegramBrowser, isSafari, isIOS, ua: ua.substring(0, 50) });

      return isTelegramBrowser || isSafari || isIOS;
  };

  const startDeepLinkAuth = async () => {
      if (configError) {
          alert(configError);
          return;
      }

      setIsDevLoginLoading(true);

      // Check browser type first
      const inAppBrowser = isInAppBrowser();

      // For regular browsers: open window IMMEDIATELY (before async fetch)
      // This prevents popup blockers since it's directly from user click
      let newWindow: Window | null = null;
      if (!inAppBrowser) {
          logger.info('[LoginPage] Regular browser, pre-opening window');
          newWindow = window.open('about:blank', '_blank');
          if (!newWindow) {
              logger.warn('[LoginPage] Popup blocked even before fetch');
              setShowMobileFallback(true);
              // Continue anyway to show fallback UI
          }
      }

      try {
          if (!supabaseAnonKey) throw new Error('Supabase Anon Key is missing');
          if (!supabaseAnonKey.startsWith('eyJ')) throw new Error('Invalid Supabase Anon Key (must be JWT)');

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
              if (newWindow) newWindow.close();
              throw new Error(`Server error ${response.status}: ${text}`);
          }

          const data = await response.json();
          if (!data.token) {
              if (newWindow) newWindow.close();
              throw new Error('Failed to generate token');
          }

          setPollingToken(data.token);
          localStorage.setItem('pending_auth_token', data.token);

          const generatedLink = `https://t.me/${botUsername}?start=auth_${data.token}`;
          setBotLink(generatedLink);

          // Handle link opening based on browser
          if (inAppBrowser) {
              logger.info('[LoginPage] In-app browser detected, showing fallback UI');
              setShowMobileFallback(true);
              setIsDevLoginLoading(false);

              // Try to redirect in same window
              try {
                  window.location.href = generatedLink;
              } catch (e) {
                  logger.warn('[LoginPage] Failed to open link automatically', e);
              }
          } else {
              // Update the pre-opened window with actual URL
              if (newWindow && !newWindow.closed) {
                  logger.info('[LoginPage] Updating pre-opened window with bot link');
                  newWindow.location.href = generatedLink;
              } else {
                  // Fallback if window was blocked or closed
                  logger.warn('[LoginPage] Window unavailable, showing fallback');
                  setShowMobileFallback(true);
              }
              setIsDevLoginLoading(false);
          }
      } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          logger.error('Error starting auth', errorMessage);
          alert('Error starting auth: ' + errorMessage);
          if (newWindow) newWindow.close();
          setIsDevLoginLoading(false);
      }
  };

  const copyBotLink = () => {
      navigator.clipboard.writeText(botLink);
      alert('Ссылка скопирована! Откройте Telegram и вставьте ссылку в любой чат');
  };

  // Restore pending token from localStorage on mount
  useEffect(() => {
      const savedToken = localStorage.getItem('pending_auth_token');
      if (savedToken && !pollingToken) {
          logger.info('[LoginPage] Restored pending token from localStorage');
          setPollingToken(savedToken);
      }
  }, [pollingToken]);

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
                  localStorage.removeItem('pending_auth_token');
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
        const devEmail = 'habbiter_dev_user@gmail.com'; 
        
        const { error } = await supabase.auth.signInWithPassword({
            email: devEmail,
            password: 'password123'
        });
        
        if (error) {
            console.log('Login failed, trying signup:', error.message);
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
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    router.push('/');
                } else {
                    alert('Тестовый пользователь создан!');
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

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const cardVariants: Variants = {
    float: (i: number) => ({
        y: [0, -10, 0],
        transition: {
            duration: 3 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5
        }
    })
  };

  return (
    <div className="relative h-screen w-full overflow-y-auto bg-background text-foreground flex flex-col">
      {/* Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <motion.div 
            animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, 0],
                opacity: [0.3, 0.5, 0.3] 
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[100px]" 
         />
         <motion.div 
            animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -10, 0],
                opacity: [0.3, 0.5, 0.3] 
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[100px]" 
         />
      </div>

      {/* Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex-1 flex flex-col items-center justify-between px-6 pt-8 pb-[150px] text-center min-h-full"
      >
        {/* Spacer for top alignment balance */}
        <div className="flex-none h-4" />

        {/* Hero Section */}
        <motion.div variants={itemVariants} className="flex-none flex flex-row items-center justify-center gap-4">
            <div className="relative flex items-center justify-center">
                <Dna size={40} weight="fill" className="text-primary" />
            </div>
            <h1
                onClick={handleLogoClick}
                className="text-4xl font-bold tracking-tight"
            >
              Habbiter
            </h1>
        </motion.div>

        {/* Visual Elements - Floating Cards */}
        {/* Using flex-1 to allow this area to grow/shrink but keeping it centered */}
        <motion.div variants={itemVariants} className="flex-1 w-full max-w-[320px] relative flex items-center justify-center min-h-[240px]">
             <div className="relative w-full h-[240px]">
                {/* Card 1 - Back */}
                <motion.div 
                    custom={0}
                    variants={cardVariants}
                    animate="float"
                    className="absolute top-0 left-8 right-8 z-0"
                >
                    <MockHabitCard 
                        name="Читать 30 минут" 
                        color="rose" 
                        icon={BookOpen} 
                        streak={12} 
                    />
                </motion.div>

                {/* Card 2 - Middle */}
                <motion.div 
                    custom={1}
                    variants={cardVariants}
                    animate="float"
                    className="absolute top-12 left-4 right-4 z-10"
                >
                    <MockHabitCard 
                        name="Пить воду" 
                        color="sapphire" 
                        icon={Drop} 
                        streak={0} 
                        completed={true}
                    />
                </motion.div>

                {/* Card 3 - Front */}
                <motion.div 
                    custom={2}
                    variants={cardVariants}
                    animate="float"
                    className="absolute top-24 left-0 right-0 z-20"
                >
                    <MockHabitCard 
                        name="Сделать зарядку" 
                        color="teal" 
                        icon={Alien} 
                        streak={3} 
                        completed={true}
                    />
                    <div className="absolute -bottom-16 left-0 right-0 text-center">
                        <p className="text-xs text-muted-foreground italic leading-relaxed w-full px-4">
                            «Вы становитесь тем, что повторяете <br/> изо дня в день» — <span className="not-italic">Аристотель</span>
                        </p>
                    </div>
                </motion.div>
            </div>
        </motion.div>

        {/* Bottom Section: Action + Quote + Dev */}
        <motion.div variants={itemVariants} className="flex-none w-full max-w-xs space-y-6 mt-16">
            {isMiniApp ? (
                 <div className="flex flex-col items-center justify-center py-4 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
                    <p className="text-sm font-medium">Вход через Telegram...</p>
                 </div>
            ) : showMobileFallback && botLink ? (
                <div className="space-y-4">
                    <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span>Ожидание авторизации...</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Если Telegram не открылся автоматически:
                        </p>
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full text-sm"
                                onClick={copyBotLink}
                            >
                                📋 Скопировать ссылку
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                                или откройте вручную:
                            </p>
                            <a
                                href={botLink}
                                className="block w-full text-xs text-center text-primary hover:underline break-all px-2"
                            >
                                {botLink}
                            </a>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                        После авторизации в боте вернитесь на эту страницу
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <Button
                        className="w-full h-14 text-lg bg-[#0F52BA] hover:bg-[#0F52BA]/90 text-white rounded-2xl shadow-lg shadow-[#0F52BA]/20 transition-all active:scale-95"
                        onClick={startDeepLinkAuth}
                        disabled={isDevLoginLoading || !!pollingToken}
                    >
                        {pollingToken ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Ожидание...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Send className="h-5 w-5" />
                                <span>Войти через Telegram</span>
                            </div>
                        )}
                    </Button>

                    {pollingToken && !showMobileFallback && (
                        <p className="text-xs text-muted-foreground animate-pulse">
                            Перейдите в Telegram бот для подтверждения
                        </p>
                    )}
                </div>
            )}

            <div className="space-y-4">
                {process.env.NODE_ENV === 'development' && (
                     <div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[10px] h-auto py-1 px-2 text-muted-foreground/50 hover:text-foreground hover:bg-transparent"
                            onClick={handleDevLogin}
                            disabled={isDevLoginLoading}
                        >
                            {isDevLoginLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <UserCircle className="w-3 h-3 mr-1" />}
                            Dev Login
                        </Button>
                        
                        {configError && (
                            <div className="mt-1 text-[10px] text-red-500 max-w-xs mx-auto">
                                ⚠️ {configError}
                            </div>
                        )}
                     </div>
                )}
            </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
