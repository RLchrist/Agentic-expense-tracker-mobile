import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function parseWithGemini(prompt: string, images: string[], apiKey: string): Promise<any> {
  const parts: any[] = [{ text: prompt }]
  
  if (images && images.length > 0) {
    for (const base64 of images) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64
        }
      })
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    }
  )

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API returned status ${response.status}: ${errText}`)
  }

  const result = await response.json()
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) {
    throw new Error('Gemini response returned empty content')
  }

  let cleaned = rawText
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    cleaned = jsonMatch[0]
  } else {
    cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
  }

  return JSON.parse(cleaned)
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

    let { text, categories, images, audio_base64, mode = 'single' } = body;

    const groqKey = Deno.env.get('GROQ_API_KEY') ?? ''
    const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? ''

    if (!groqKey && !geminiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Neither GROQ_API_KEY nor GEMINI_API_KEY is configured in Deno environment' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- VOICE MODE: transcribe audio first via Groq Whisper, then parse ---
    if (mode === 'voice') {
      if (!audio_base64) {
        return new Response(
          JSON.stringify({ success: false, error: 'No audio_base64 provided for voice mode' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Decode base64 audio
      const binaryString = atob(audio_base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Send to Groq Whisper transcription API
      const formData = new FormData()
      const blob = new Blob([bytes], { type: 'audio/wav' })
      formData.append('file', blob, 'recording.wav')
      formData.append('model', 'whisper-large-v3-turbo')
      formData.append('response_format', 'json')
      formData.append('language', 'en')

      const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}` },
        body: formData,
      })

      if (!whisperRes.ok) {
        const errText = await whisperRes.text()
        console.error('Groq Whisper error:', whisperRes.status, errText)
        return new Response(
          JSON.stringify({ success: false, error: 'Transcription failed', details: errText }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const whisperData = await whisperRes.json()
      text = whisperData.text || ''
      console.log('Voice transcription:', text)

      if (!text) {
        return new Response(
          JSON.stringify({ success: false, error: 'Empty transcription' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fall through to text parsing below with the transcribed text
      mode = 'single'
    }

    if (!text && (!images || images.length === 0)) {
      return new Response(
        JSON.stringify({ success: false, error: 'No text or images provided' }),
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

      prompt = `You are an expert AI expense parser designed for a Nepali expense tracker.
Extract the expense details from the input text, which may be in English, Nepali script, or Romanized Nepali (Nepali written in English alphabet).

Specifically:
- Translate/normalize Nepali numbers and Romanized Nepali numbers to exact numeric amounts:
  - "panch se" / "पाँच सय" = 500
  - "tin se" / "तीन सय" = 300
  - "ek hajar" / "एक हजार" = 1000
  - "ek hajar panch se" / "१५ सय" = 1500
  - "dui hajar" / "दुई हजार" = 2000
  - "panchas" / "पचास" = 50
  - "saya" / "सय" = 100
  - "dui se" / "दुई सय" = 200
  - "tin hajar" / "तीन हजार" = 3000
- For "title", extract a clean description (e.g., "Momo" if the user says "momo khaye" or "म:म खाएको").
- For "amount", output a pure integer number.
- Matched "category" must correspond to one of the provided category names and IDs.

Categories: ${categoryList}
Today: ${today}

Input text: "${text || 'No text provided'}"

Output raw JSON strictly in this format:
{
  "title": "Clean short title in English or simple words",
  "amount": numeric_amount_here,
  "category_name": "Matched Category Name",
  "category_id": "Matched Category ID",
  "expense_date": "YYYY-MM-DD",
  "payment_method": "cash",
  "note": "Any additional context or the original spoken phrase",
  "confidence": 0.95
}`
    }

    let parsedResult = null
    let modelUsed = ''

    // --- STEP 1: Attempt Gemini 2.5 Flash ---
    if (geminiKey) {
      try {
        console.log("Attempting to parse expense with Gemini 2.5 Flash...")
        parsedResult = await parseWithGemini(prompt, images ?? [], geminiKey)
        modelUsed = 'gemini-2.5-flash'
        console.log("Successfully parsed expense using Gemini!")
      } catch (geminiError) {
        console.warn("Gemini parsing failed, trying Groq fallback...", geminiError)
      }
    }

    // --- STEP 2: Fallback to Groq Llama ---
    if (!parsedResult && groqKey) {
      try {
        const hasImages = images && images.length > 0
        const model = hasImages ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile'
        modelUsed = model
        
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

        console.log(`Calling Groq fallback with model ${model}, hasImages: ${hasImages}`)
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

        if (response.ok) {
          const groqData = await response.json()
          const rawText = groqData.choices?.[0]?.message?.content ?? ''
          if (rawText) {
            let cleaned = rawText
            const jsonMatch = rawText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              cleaned = jsonMatch[0]
            } else {
              cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
            }
            parsedResult = JSON.parse(cleaned)
            console.log("Successfully parsed expense using Groq Llama fallback!")
          }
        } else {
          const errText = await response.text()
          console.error('Groq fallback failed status:', response.status, errText)
        }
      } catch (groqError) {
        console.error("Groq fallback execution also failed:", groqError)
      }
    }

    // --- STEP 3: Return Response ---
    if (!parsedResult) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Both Gemini and Groq AI models failed to parse the expense. Will trigger on-device local NLP.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: parsedResult, model_used: modelUsed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Parsing failed completely', details: String(error) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})