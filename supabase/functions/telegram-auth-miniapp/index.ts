// @ts-expect-error Deno import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-expect-error Deno import
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing environment variables')
    }

    const data = await req.json()
    
    // 1. Verify Telegram WebApp initData
    const { initData } = data
    if (!initData) {
        return new Response(JSON.stringify({ error: 'Missing initData' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { isValid, user: telegramUser } = await verifyTelegramWebAppData(initData, TELEGRAM_BOT_TOKEN)
    
    if (!isValid || !telegramUser) {
      return new Response(JSON.stringify({ error: 'Invalid initData signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    // 3. Check channel subscription
    const isSubscribed = await checkChannelSubscription(telegramUser.id, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID)
    
    // 4. Create/Get Auth User and Upsert Public User
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const email = `${telegramUser.id}@telegram.user`
    const password = TELEGRAM_BOT_TOKEN 
    
    // Try to create auth user (ignore if exists)
    const { data: createdUser } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { telegram_id: telegramUser.id }
    })
    
    let userId = createdUser?.user?.id

    if (!userId) {
        // User likely exists, let's sign in to get ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (signInError) throw signInError
        userId = signInData.user.id
    }

    // Upsert public user data linked to Auth ID
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        photo_url: telegramUser.photo_url,
        is_subscribed: isSubscribed,
        subscription_checked_at: new Date().toISOString(),
        subscription_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        last_login_at: new Date().toISOString()
      }, { onConflict: 'telegram_id' })

    if (userError) {
        console.error('User upsert error:', userError)
        throw userError
    }
    
    // 5. Create Session
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email,
        password
    })
    
    if (sessionError) throw sessionError

    return new Response(JSON.stringify({
      success: true,
      isSubscribed,
      session: sessionData.session
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

// Validation for Mini App (different from Widget)
async function verifyTelegramWebAppData(initData: string, token: string) {
  // Parse query string
  const urlParams = new URLSearchParams(initData)
  const hash = urlParams.get('hash')
  urlParams.delete('hash')
  
  // Sort keys
  const keys = Array.from(urlParams.keys()).sort()
  const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join('\n')
  
  // Create HMAC-SHA256 signature
  const encoder = new TextEncoder()
  const secretKey = await crypto.subtle.importKey(
    'raw', 
    encoder.encode('WebAppData'), 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  )
  const secret = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(token))
  
  const signingKey = await crypto.subtle.importKey(
    'raw', 
    secret, 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', signingKey, encoder.encode(dataCheckString))
  const hexSignature = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
  
  if (hexSignature === hash) {
      const user = JSON.parse(urlParams.get('user') || '{}')
      return { isValid: true, user }
  }
  
  return { isValid: false, user: null }
}

async function checkChannelSubscription(userId: string, token: string, channelId: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${channelId}&user_id=${userId}`)
    const data = await res.json()
    if (!data.ok) {
        console.error('Telegram API error:', data)
        return false
    }
    const status = data.result.status
    return ['creator', 'administrator', 'member', 'restricted'].includes(status)
  } catch (e) {
    console.error('Error checking subscription:', e)
    return false
  }
}
