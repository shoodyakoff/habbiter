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
                console.log(`Checking subscription for user ${userId} in channel ${TELEGRAM_CHANNEL_ID}`)
                const isSubscribed = await checkChannelSubscription(userId, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID)
                console.log(`Subscription status for ${userId}: ${isSubscribed}`)

                if (!isSubscribed) {
                    // Not subscribed - send message with link
                    const channelName = TELEGRAM_CHANNEL_ID.replace('@', '')
                    const channelLink = `https://t.me/${channelName}`
                    
                    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `❌ Вы не подписаны на канал.\n\nДля авторизации необходимо подписаться: @${channelName}\n\nПосле подписки отправьте /start еще раз (или перейдите по ссылке с сайта).`,
                            reply_markup: {
                                inline_keyboard: [[
                                    { text: 'Подписаться на канал', url: channelLink }
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

    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error(error)
    return new Response('error', { status: 400 })
  }
})

// Helper to perform auth logic (DRY)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function authorizeUser(supabase: any, tokenData: any, userId: number, messageOrUser: any, isSubscribed: boolean, botToken: string, chatId: number) {
    // Extract user info
    const user = messageOrUser.from ? messageOrUser.from : messageOrUser;

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
    await sendMessage(chatId, botToken, "✅ Вы успешно авторизовались! Можете возвращаться в приложение.")
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
    // Ensure channelId starts with @ if it's a username (not a number)
    let formattedChannelId = channelId.trim();
    if (!formattedChannelId.startsWith('@') && !formattedChannelId.startsWith('-100') && isNaN(Number(formattedChannelId))) {
        formattedChannelId = `@${formattedChannelId}`;
    }

    console.log(`Making request to getChatMember for channel: ${formattedChannelId}, user: ${userId}`);
    const res = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${formattedChannelId}&user_id=${userId}`)
    const data = await res.json()
    
    if (!data.ok) {
        console.error('Telegram API error (checkChannelSubscription):', JSON.stringify(data));
        return false
    }
    
    const status = data.result.status
    console.log(`User ${userId} status in channel ${formattedChannelId}: ${status}`);
    
    return ['creator', 'administrator', 'member', 'restricted'].includes(status)
  } catch (e) {
    console.error('Error checking subscription:', e)
    return false
  }
}
