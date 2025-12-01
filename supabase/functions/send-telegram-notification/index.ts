import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { chat_id, text, action_url, action_text } = await req.json()
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set')
    }

    if (!chat_id || !text) {
      throw new Error('Missing chat_id or text')
    }

    const payload: any = {
      chat_id,
      text,
      parse_mode: 'HTML',
    }

    // Add inline keyboard if action_url is provided
    if (action_url) {
      payload.reply_markup = {
        inline_keyboard: [
          [
            {
              text: action_text || 'Open App',
              url: action_url,
            },
          ],
        ],
      }
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    const data = await response.json()

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`)
    }

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
