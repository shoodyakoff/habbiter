'use client';

import React from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { User, ShieldCheck, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('users')
        .select('is_subscribed, subscription_expires_at')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <div className="pb-24 min-h-screen bg-background container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Профиль</h1>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-6 flex items-center gap-4">
        {user.user_metadata?.photo_url ? (
          <img 
            src={user.user_metadata.photo_url} 
            alt="Avatar" 
            className="w-16 h-16 rounded-full"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User size={32} />
          </div>
        )}
        
        <div>
          <h2 className="text-xl font-semibold">
            {user.user_metadata?.first_name} {user.user_metadata?.last_name}
          </h2>
          <p className="text-muted-foreground text-sm">@{user.user_metadata?.username || 'user'}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-green-500" />
            <span className="font-medium">Статус подписки</span>
          </div>
          <span className={subscription?.is_subscribed ? "text-green-500 font-bold" : "text-red-500"}>
            {subscription?.is_subscribed ? 'Активна' : 'Не активна'}
          </span>
        </div>
        {subscription?.subscription_expires_at && (
            <p className="text-xs text-muted-foreground">
                Действует до: {new Date(subscription.subscription_expires_at).toLocaleDateString()}
            </p>
        )}
      </div>

      <Button variant="destructive" className="w-full" onClick={handleSignOut}>
        <LogOut className="mr-2 h-4 w-4" />
        Выйти
      </Button>
    </div>
  );
}
