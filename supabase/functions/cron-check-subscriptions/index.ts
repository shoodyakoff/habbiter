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
    // 1. Get users to check (expired cache)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // We check users where subscription_expires_at is in the past
    const { data: users, error } = await supabase
        .from('users')
        .select('id, telegram_id, is_subscribed')
        .lt('subscription_expires_at', new Date().toISOString())
        .limit(100) // Batch size
    
    if (error) throw error
    
    const results = []
    
    if (users) {
        for (const user of users) {
            const isSubscribed = await checkChannelSubscription(user.telegram_id, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID)
            
            // Update user
            await supabase.from('users').update({
                is_subscribed: isSubscribed,
                subscription_checked_at: new Date().toISOString(),
                // Reset expiry to 7 days from now
                subscription_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }).eq('id', user.id)
            
            // Log check
            await supabase.from('subscription_checks').insert({
                user_id: user.id,
                is_subscribed: isSubscribed,
                check_method: 'cron',
                status: isSubscribed ? 'member' : 'left'
            })
            
            if (user.is_subscribed && !isSubscribed) {
                // Send notification if they just lost subscription
                 await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: user.telegram_id,
                        text: '⚠️ Ваша подписка истекла или вы вышли из канала. Пожалуйста, подпишитесь снова, чтобы продолжить использовать Habbiter.',
                        reply_markup: {
                            inline_keyboard: [[
                                { text: 'Подписаться', url: `https://t.me/${TELEGRAM_CHANNEL_ID.replace('@', '')}` },
                                { text: 'Я подписался', callback_data: 'check_subscription' }
                            ]]
                        }
                    })
                })
            }
            
            results.push({ id: user.id, isSubscribed })
        }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), { headers: { 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
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
