// @ts-expect-error Deno import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error Deno import
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
            const { data: tokenData } = await supabase
                .from('auth_tokens')
                .select('*')
                .eq('token', token)
                .eq('status', 'pending')
                .single()
                
            if (tokenData) {
                // Check subscription FIRST
                const isSubscribed = await checkChannelSubscription(userId, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID)

                if (!isSubscribed) {
                    // Not subscribed - send message with button
                    const channelLink = `https://t.me/${TELEGRAM_CHANNEL_ID.replace('@', '')}`
                    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `🔒 Для входа в Habbiter необходимо подписаться на наш канал: ${TELEGRAM_CHANNEL_ID}\n\nПосле подписки нажмите кнопку ниже.`,
                            reply_markup: {
                                inline_keyboard: [[
                                    { text: 'Подписаться', url: channelLink },
                                    { text: 'Я подписался', callback_data: `check_auth_subscription:${token}` }
                                ]]
                            }
                        })
                    })
                    return new Response('ok', { status: 200 })
                }

                // If subscribed, proceed with auth
                await authorizeUser(supabase, tokenData, userId, message, isSubscribed, TELEGRAM_BOT_TOKEN, chatId)
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
        
        // Handle subscription check during auth flow
        if (data.startsWith('check_auth_subscription:')) {
            const token = data.split(':')[1]
            const isSubscribed = await checkChannelSubscription(telegramId, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID)

            if (isSubscribed) {
                const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
                
                // Verify token again just in case
                const { data: tokenData } = await supabase
                    .from('auth_tokens')
                    .select('*')
                    .eq('token', token)
                    .eq('status', 'pending')
                    .single()

                if (tokenData) {
                    await authorizeUser(supabase, tokenData, telegramId, query.message, isSubscribed, TELEGRAM_BOT_TOKEN, telegramId) // query.message structure might differ slightly but for username etc we might need query.from
                    
                    // Answer callback
                    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            callback_query_id: query.id,
                            text: '✅ Успешно! Вы авторизованы.',
                        })
                    })
                } else {
                     await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            callback_query_id: query.id,
                            text: '⚠️ Срок действия ссылки истек.',
                            show_alert: true
                        })
                    })
                }
            } else {
                 await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        callback_query_id: query.id,
                        text: '❌ Вы еще не подписались на канал.',
                        show_alert: true
                    })
                })
            }
        }

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

// Helper to perform auth logic (DRY)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function authorizeUser(supabase: any, tokenData: any, userId: number, messageOrUser: any, isSubscribed: boolean, botToken: string, chatId: number) {
    // Extract user info. If coming from message, it's message.from. If from callback, we might pass query.from directly
    const user = messageOrUser.from ? messageOrUser.from : messageOrUser; // Attempt to handle both message object or user object

    // Update token with user info
    await supabase
        .from('auth_tokens')
        .update({
            status: 'success',
            telegram_id: userId,
            telegram_username: user.username,
            telegram_first_name: user.first_name,
            telegram_photo_url: null 
        })
        .eq('id', tokenData.id)
    
    // Create/Get Auth User
    const email = `${userId}@telegram.user`
    const password = botToken
    
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
            username: user.username,
            first_name: user.first_name,
            is_subscribed: isSubscribed,
            last_login_at: new Date().toISOString()
            }, { onConflict: 'telegram_id' })
    }
    
    // Send success message
    await sendMessage(chatId, botToken, "✅ Успешная авторизация! Вернитесь на сайт, вас должно автоматически авторизовать.")
}

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
  } catch {
    return false
  }
}
