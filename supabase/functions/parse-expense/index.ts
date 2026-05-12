import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, categories } = await req.json()

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'No text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const groqKey = Deno.env.get('GROQ_API_KEY') ?? ''

    if (!groqKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const categoryList = categories
      ?.map((c: any) => `${c.name} (id: ${c.id})`)
      .join(', ') ?? ''

    const today = new Date().toISOString().split('T')[0]

    const prompt = `You are an expense parsing assistant. Extract expense details from natural language.

Today's date: ${today}
Available categories: ${categoryList}
User input: "${text}"

Return ONLY a raw JSON object, no markdown, no backticks, no explanation:
{
  "title": "short descriptive title",
  "amount": 0,
  "category_name": "matched category name",
  "category_id": "matched category id",
  "expense_date": "YYYY-MM-DD",
  "payment_method": "cash",
  "note": null,
  "confidence": 0.9
}

Rules:
- amount must be a number, no currency symbols
- match category intelligently (bus/taxi/fare = Transport, lunch/food/restaurant = Food & Dining)
- default payment_method to "cash" if not mentioned
- default expense_date to today if not mentioned
- confidence between 0 and 1`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are an expense parsing assistant. Always respond with valid raw JSON only. No markdown. No explanation.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 512,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Groq API error:', response.status, errText)
      return new Response(
        JSON.stringify({ error: 'Groq API failed', details: errText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const groqData = await response.json()
    const rawText = groqData.choices?.[0]?.message?.content ?? ''

    console.log('Groq raw response:', rawText)

    if (!rawText) {
      return new Response(
        JSON.stringify({ error: 'Empty response from Groq' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean any accidental markdown
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('JSON parse failed:', cleaned)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON from Groq', raw: cleaned }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Parsing failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})