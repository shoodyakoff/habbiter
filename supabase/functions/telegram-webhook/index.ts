// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const TELEGRAM_CHANNEL_ID = Deno.env.get('TELEGRAM_CHANNEL_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req: Request) => {
  try {
    const update = await req.json()
    
    // Check if callback_query
    if (update.callback_query) {
        const query = update.callback_query
        const telegramId = query.from.id
        const data = query.data
        
        if (data === 'check_subscription') {
            const isSubscribed = await checkChannelSubscription(telegramId, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID)
            
            // Update DB if user exists
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            
            // We need to find the user by telegram_id
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('telegram_id', telegramId)
                .single()
            
            if (user) {
                await supabase.from('users').update({
                    is_subscribed: isSubscribed,
                    subscription_checked_at: new Date().toISOString()
                }).eq('id', user.id)
                
                // Log check
                await supabase.from('subscription_checks').insert({
                    user_id: user.id,
                    is_subscribed: isSubscribed,
                    check_method: 'webhook_button',
                    status: isSubscribed ? 'member' : 'left'
                })
            }
            
            // Answer callback query
            const text = isSubscribed ? '✅ Подписка подтверждена! Вы можете вернуться в приложение.' : '❌ Вы не подписаны на канал. Пожалуйста, подпишитесь.'
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callback_query_id: query.id,
                    text: text,
                    show_alert: true
                })
            })
        }
    }

    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error(error)
    return new Response('error', { status: 400 })
  }
})

async function checkChannelSubscription(userId: string | number, token: string, channelId: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${channelId}&user_id=${userId}`)
    const data = await res.json()
    if (!data.ok) return false
    const status = data.result.status
    return ['creator', 'administrator', 'member'].includes(status)
  } catch (e) {
    return false
  }
}
