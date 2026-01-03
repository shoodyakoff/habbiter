// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { action, token } = await req.json()

    // 1. Generate Token
    if (action === 'generate') {
        const { data, error } = await supabase
            .from('auth_tokens')
            .insert({})
            .select()
            .single()
        
        if (error) throw error
        
        return new Response(JSON.stringify({ token: data.token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    // 2. Poll Token
    if (action === 'poll') {
        if (!token) throw new Error('Token required')
        
        const { data: tokenData, error } = await supabase
            .from('auth_tokens')
            .select('*')
            .eq('token', token)
            .single()
            
        if (error || !tokenData) return new Response(JSON.stringify({ status: 'pending' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        
        if (tokenData.status === 'success') {
            // Create session for the frontend
            const email = `${tokenData.telegram_id}@telegram.user`
            const password = TELEGRAM_BOT_TOKEN
            
            const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            
            if (sessionError) throw sessionError
            
            return new Response(JSON.stringify({ 
                status: 'success', 
                session: sessionData.session 
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        
        return new Response(JSON.stringify({ status: tokenData.status }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error('Invalid action')

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

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
