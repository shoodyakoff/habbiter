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
    
    // 1. Verify Telegram hash
    const isValid = await verifyTelegramHash(data, TELEGRAM_BOT_TOKEN)
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid hash' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    // 2. Check auth_date (must be within 24 hours? Spec says < 1 hour)
    const authDate = parseInt(data.auth_date)
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 3600) {
      return new Response(JSON.stringify({ error: 'Auth data expired' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    // 3. Check channel subscription
    const isSubscribed = await checkChannelSubscription(data.id, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID)
    
    // 4. Create/Get Auth User and Upsert Public User
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const email = `${data.id}@telegram.user`
    const password = TELEGRAM_BOT_TOKEN 
    
    // 1. Search for user in public.users via telegram_id
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', data.id)
      .single()

    let userId = existingUser?.id

    if (!userId) {
        // 2. Create user if not found
        const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { telegram_id: data.id }
        })

        if (createError) {
             if (createError.message?.includes('already exists')) {
                // Fallback: User exists in Auth but not in public table (sync issue)
                const { data: signInData } = await supabase.auth.signInWithPassword({ email, password })
                userId = signInData?.user?.id
            } else {
                throw createError
            }
        } else {
            userId = createdUser.user.id
        }
    }

    // Upsert public user data linked to Auth ID
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        telegram_id: data.id,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        photo_url: data.photo_url,
        is_subscribed: isSubscribed,
        subscription_checked_at: new Date().toISOString(),
        subscription_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        last_login_at: new Date().toISOString()
      }, { onConflict: 'telegram_id' })

    if (userError) {
        console.error('User upsert error:', userError)
        throw userError
    }

    // Update JWT metadata ONLY if changed
    const { data: { user: currentUser } } = await supabase.auth.admin.getUserById(userId)
    if (currentUser?.app_metadata?.is_subscribed !== isSubscribed) {
        await supabase.auth.admin.updateUserById(userId, {
            app_metadata: { is_subscribed: isSubscribed }
        })
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifyTelegramHash(data: any, token: string) {
  const { hash, ...rest } = data
  // 1. Create data-check-string
  const items = Object.keys(rest).sort().map(key => `${key}=${rest[key]}`)
  const dataCheckString = items.join('\n')
  
  // 2. Compute SHA256 of token
  const encoder = new TextEncoder()
  const secretKey = await crypto.subtle.digest('SHA-256', encoder.encode(token))
  
  // 3. Compute HMAC-SHA256 of data-check-string
  const key = await crypto.subtle.importKey('raw', secretKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataCheckString))
  
  // 4. Compare hex string
  const hexSignature = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hexSignature === hash
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
    return ['creator', 'administrator', 'member'].includes(status)
  } catch (e) {
    console.error('Error checking subscription:', e)
    return false
  }
}
