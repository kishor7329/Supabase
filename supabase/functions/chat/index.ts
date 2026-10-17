import { corsHeaders } from '../_shared/cors.ts'

// If you get a model error, check the current model name in Google AI Studio docs
const MODEL = 'gemini-3.8-flash'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { messages } = await req.json()

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': Deno.env.get('GEMINI_API_KEY')!,
        },
        body: JSON.stringify({ contents }),
      },
    )

    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message ?? 'Gemini request failed')

    const reply = data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
