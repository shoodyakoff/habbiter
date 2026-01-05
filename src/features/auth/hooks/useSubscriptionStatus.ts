import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const subscriptionKeys = {
  status: ['subscription', 'status'] as const,
};

export function useSubscriptionStatus() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: subscriptionKeys.status,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // 1. Check JWT metadata first (instant, no API calls)
      if (user.app_metadata?.is_subscribed === true) {
        return { isSubscribed: true, source: 'jwt', needsCheck: false };
      }

      // 2. Check DB with expiry date
      const { data, error } = await supabase
        .from('users')
        .select('is_subscribed, subscription_expires_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const expiresAt = data.subscription_expires_at
        ? new Date(data.subscription_expires_at)
        : new Date(0);
      const now = new Date();
      const needsCheck = expiresAt < now;

      return {
        isSubscribed: data.is_subscribed,
        expiresAt: data.subscription_expires_at,
        needsCheck, // true = cache expired, needs check
        source: 'db'
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (React Query v5)
  });

  const checkSubscription = useMutation({
    mutationFn: async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        console.error('[useSubscriptionStatus] No valid session:', sessionError);
        throw new Error('no_session');
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/check-subscription`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!res.ok && res.status === 401) {
        const errorText = await res.text();
        console.error('[useSubscriptionStatus] 401 Unauthorized:', errorText);
        throw new Error('unauthorized');
      }

      const data = await res.json();

      // Handle network errors gracefully
      if (data.errorType === 'network_error' || data.isSubscribed === null) {
        throw new Error('network_error');
      }

      return data;
    },
    onSuccess: (data) => {
      // Update cache with fresh data
      queryClient.setQueryData(subscriptionKeys.status, {
        isSubscribed: data.isSubscribed,
        expiresAt: data.checkedAt,
        needsCheck: false,
        source: 'manual'
      });
    },
  });

  return {
    status,
    isLoading,
    checkSubscription,
  };
}
