'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function SubscribePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const channelUsername = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_USERNAME || '';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const checkSubscription = async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-subscription`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const data = await res.json();
      
      if (data.isSubscribed) {
        router.push('/');
      } else {
        alert('Похоже, вы еще не подписались. Попробуйте снова через пару секунд после подписки.');
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка при проверке подписки');
    } finally {
      setChecking(false);
    }
  };

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
                    onClick={checkSubscription}
                    disabled={checking}
                >
                    {checking ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <CheckCircle className="mr-2 h-5 w-5" />
                    )}
                    Я подписался
                </Button>
            </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
            Это бесплатно и помогает нам развивать проект. Вы сможете отписаться в любой момент (но доступ к приложению будет ограничен).
        </p>
      </div>
    </div>
  );
}
