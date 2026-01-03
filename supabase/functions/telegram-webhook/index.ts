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
    
    // Check if message (start command)
    if (update.message) {
        const message = update.message
        const text = message.text || ''
        const chatId = message.chat.id
        const userId = message.from.id
        
        // Handle /start auth_<uuid>
        if (text.startsWith('/start auth_')) {
            const token = text.split('auth_')[1]
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            
            // Verify token exists and is pending
            const { data: tokenData, error: tokenError } = await supabase
                .from('auth_tokens')
                .select('*')
                .eq('token', token)
                .eq('status', 'pending')
                .single()
                
            if (tokenData) {
                // Update token with user info
                await supabase
                    .from('auth_tokens')
                    .update({
                        status: 'success',
                        telegram_id: userId,
                        telegram_username: message.from.username,
                        telegram_first_name: message.from.first_name,
                        telegram_photo_url: null // Cannot get photo directly from message, need userProfilePhotos API if critical
                    })
                    .eq('id', tokenData.id)
                
                // Also ensure user exists in our users table (upsert)
                const isSubscribed = await checkChannelSubscription(userId, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID)
                
                // Create auth user logic similar to telegram-auth
                // We'll duplicate some logic here or rely on the frontend polling to create the session?
                // Better to create the user here so it's ready.
                
                // Create/Get Auth User
                const email = `${userId}@telegram.user`
                const password = TELEGRAM_BOT_TOKEN
                
                // Try to create auth user
                const { data: createdUser } = await supabase.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { telegram_id: userId }
                })
                
                let authUserId = createdUser?.user?.id
                if (!authUserId) {
                    const { data: signInData } = await supabase.auth.signInWithPassword({ email, password })
                    authUserId = signInData?.user?.id
                }

                if (authUserId) {
                     await supabase.from('users').upsert({
                        id: authUserId,
                        telegram_id: userId,
                        username: message.from.username,
                        first_name: message.from.first_name,
                        is_subscribed: isSubscribed,
                        last_login_at: new Date().toISOString()
                     }, { onConflict: 'telegram_id' })
                }
                
                // Send success message
                await sendMessage(chatId, TELEGRAM_BOT_TOKEN, "✅ Вы успешно авторизовались! Вернитесь в браузер.")
            } else {
                 await sendMessage(chatId, TELEGRAM_BOT_TOKEN, "⚠️ Ссылка устарела или недействительна. Попробуйте снова на сайте.")
            }
        }
    }

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

async function sendMessage(chatId: number, token: string, text: string) {
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text
            })
        })
    } catch (e) {
        console.error('Error sending message:', e)
    }
}

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
