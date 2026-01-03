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

  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
