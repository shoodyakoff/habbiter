'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSubscriptionStatus } from '@/features/auth/hooks/useSubscriptionStatus';
import { useRouter } from 'next/navigation';
import { Loader2, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SubscribePage() {
  const { user, loading } = useAuth();
  const { checkSubscription } = useSubscriptionStatus();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelUsername = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_USERNAME || '';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleCheck = useCallback(async () => {
    setIsChecking(prev => {
      if (prev) return prev; // Already checking, don't start again
      return true;
    });
    setError(null);

    try {
      const result = await checkSubscription.mutateAsync();

      // Check if user is actually subscribed
      if (result.isSubscribed) {
        // Success - user is subscribed, redirect to main page
        router.push('/');
      } else {
        // User checked but is not subscribed
        setError('Похоже, вы еще не подписались на канал. Пожалуйста, подпишитесь и попробуйте снова.');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Ошибка при проверке подписки';

      // Network error → allow access (as per user's requirement)
      if (errorMessage.includes('network_error')) {
        console.warn('[Subscribe] Network error, allowing access');
        router.push('/');
        return;
      }

      // Session error → show error on the same page, don't redirect
      if (errorMessage.includes('no_session') || errorMessage.includes('unauthorized')) {
        console.error('[Subscribe] Session error:', errorMessage);
        setError('Произошла ошибка авторизации. Пожалуйста, перезагрузите страницу и попробуйте снова.');
        return;
      }

      // Other errors → show generic error message
      setError('Произошла ошибка при проверке подписки. Попробуйте снова через несколько секунд.');
    } finally {
      setIsChecking(false);
    }
  }, [checkSubscription, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="max-w-md w-full space-y-8">
        <div>
            <h1 className="text-3xl font-bold mb-4">Почти готово! 🚀</h1>
            <p className="text-muted-foreground text-lg mb-8">
            Для использования приложения Habbiter необходимо подписаться на наш Telegram канал.
            </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col gap-4">
                <Button 
                    size="lg" 
                    className="w-full text-lg h-14" 
                    onClick={() => window.open(`https://t.me/${channelUsername}`, '_blank')}
                >
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Подписаться на канал
                </Button>

                <Button
                    size="lg"
                    variant="secondary"
                    className="w-full text-lg h-14"
                    onClick={handleCheck}
                    disabled={isChecking}
                >
                    {isChecking ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <CheckCircle className="mr-2 h-5 w-5" />
                    )}
                    Я подписался
                </Button>
            </div>

            {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive rounded-lg p-4 text-sm">
                    {error}
                </div>
            )}
        </div>
        
        <p className="text-sm text-muted-foreground">
            Это бесплатно и помогает нам развивать проект. Вы сможете отписаться в любой момент (но доступ к приложению будет ограничен).
        </p>
      </div>
    </div>
  );
}
