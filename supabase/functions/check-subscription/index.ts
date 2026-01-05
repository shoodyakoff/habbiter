// @ts-expect-error Deno import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const TELEGRAM_CHANNEL_ID = Deno.env.get('TELEGRAM_CHANNEL_ID')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing environment variables')
    }

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Use service role to verify JWT token
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token)

    if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get telegram_id from public users table using service role (reuse adminSupabase)
    const { data: userData, error: dbError } = await adminSupabase
        .from('users')
        .select('telegram_id')
        .eq('id', user.id)
        .single()
        
    if (dbError || !userData) {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check subscription
    const isSubscribed = await checkChannelSubscription(String(userData.telegram_id), TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID)

    console.log(`User ${userData.telegram_id} subscription status: ${isSubscribed}`);

    // Update user status in public table
    await adminSupabase.from('users').update({
        is_subscribed: isSubscribed,
        subscription_checked_at: new Date().toISOString()
    }).eq('id', user.id)

    // Update user app_metadata in Auth (so it's available in JWT)
    await adminSupabase.auth.admin.updateUserById(
      user.id,
      { app_metadata: { is_subscribed: isSubscribed } }
    )
    
    // Log check
    await adminSupabase.from('subscription_checks').insert({
        user_id: user.id,
        is_subscribed: isSubscribed,
        check_method: 'manual',
        status: isSubscribed ? 'member' : 'left'
    })

    return new Response(JSON.stringify({
      isSubscribed,
      checkedAt: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Check subscription error:', errorMessage);

    // Return structured error response with errorType
    // This helps frontend distinguish between network errors and actual failures
    return new Response(JSON.stringify({
      error: errorMessage,
      errorType: 'network_error',
      isSubscribed: null // null = unknown status (not false!)
    }), {
      status: 500, // 500 for network errors (not 400)
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function checkChannelSubscription(userId: string, token: string, channelId: string) {
  try {
    // Ensure channelId starts with @ if it's a username (not a number)
    let formattedChannelId = channelId.trim();
    if (!formattedChannelId.startsWith('@') && !formattedChannelId.startsWith('-100') && isNaN(Number(formattedChannelId))) {
        formattedChannelId = `@${formattedChannelId}`;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${formattedChannelId}&user_id=${userId}`)
    const data = await res.json()

    if (!data.ok) {
        console.error('Telegram API error:', JSON.stringify(data));
        throw new Error('telegram_api_error') // Throw instead of return false
    }

    const status = data.result.status
    return ['creator', 'administrator', 'member', 'restricted'].includes(status)
  } catch (e) {
    console.error('Check subscription network error:', e);
    throw new Error('network_error') // Throw instead of return false
  }
}
