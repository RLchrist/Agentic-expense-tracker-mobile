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
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body', details: String(err) }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { text, categories, images, mode = 'single' } = body;

    if (!text && (!images || images.length === 0)) {
      return new Response(
        JSON.stringify({ success: false, error: 'No text or images provided' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const groqKey = Deno.env.get('GROQ_API_KEY') ?? ''

    if (!groqKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'GROQ_API_KEY not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let prompt = ''

    if (mode === 'group') {
      prompt = `You are an AI group expense parser. Extract multiple expenses from the input text.
For each person who paid, extract their name, the amount they paid, and a short description of what they paid for.

Input text: "${text || 'No text provided'}"

Output raw JSON strictly in this format:
{
  "expenses": [
    {
      "payerName": "Name of the person who paid",
      "amount": numeric_amount_here,
      "description": "Short description of what was paid for"
    }
  ]
}`
    } else {
      const categoryList = categories
        ?.map((c: any) => `${c.name} (id: ${c.id})`)
        .join(', ') ?? ''

      const today = new Date().toISOString().split('T')[0]

      prompt = `You are an AI expense parser. Extract the following from the input:
- title: short description
- amount: total number
- category: matched from the list
- date: YYYY-MM-DD
- payment: method (default: cash)

Categories: ${categoryList}
Today: ${today}

Input text: "${text || 'No text provided'}"

Output raw JSON:
{
  "title": "",
  "amount": 0,
  "category_name": "",
  "category_id": "",
  "expense_date": "",
  "payment_method": "cash",
  "note": null,
  "confidence": 0.9
}`
    }

    const hasImages = images && images.length > 0
    // Try the full name as per developer docs
    const model = hasImages ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile'

    let userContent: any
    if (hasImages) {
      userContent = [
        { type: 'text', text: prompt },
        ...images.map((base64: string) => ({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64}` }
        }))
      ]
    } else {
      userContent = prompt
    }

    console.log(`Calling Groq with model ${model}, hasImages: ${hasImages}`)

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Groq API error:', response.status, errText)
      
      // If model not found, try to list available models for debugging
      let availableModels = []
      try {
        const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${groqKey}` }
        })
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json()
          availableModels = modelsData.data?.map((m: any) => m.id) || []
        }
      } catch (e) {
        console.error('Failed to list models:', e)
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Groq API failed', 
          status: response.status, 
          details: errText,
          model_used: model,
          available_models: availableModels
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const groqData = await response.json()
    const rawText = groqData.choices?.[0]?.message?.content ?? ''

    if (!rawText) {
      return new Response(
        JSON.stringify({ success: false, error: 'Empty response from Groq' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // More robust JSON extraction
    let cleaned = rawText
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleaned = jsonMatch[0]
    } else {
      cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
    }

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('JSON parse failed:', cleaned)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON from Groq', 
          details: cleaned,
          raw_full: rawText 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Parsing failed', details: String(error) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})