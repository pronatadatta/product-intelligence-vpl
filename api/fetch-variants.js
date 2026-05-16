const Groq = require('groq-sdk')

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { brand, model } = req.body
  if (!brand || !model) return res.status(400).json({ error: 'brand and model required' })

  const userPrompt = `List all official color, size, and edition/material variants for the ${brand} ${model}.
DO NOT include connectivity variants like LTE vs Wi-Fi — only physical variants (color, size, special edition).
Return ONLY a JSON array where each item has:
- "color": color name or null
- "variant": special edition or material name or null (e.g. "Titanium", "Stephen Curry Edition")
- "size": physical size like "41mm" or "Size 6" or null

Example: [{"color": "Obsidian", "variant": null, "size": "41mm"}, {"color": "Silver", "variant": "Titanium", "size": "45mm"}]

Return ONLY the JSON array, no markdown, no explanation.`

  const callModel = async (model) => {
    return client.chat.completions.create({
      model,
      max_tokens: 768,
      messages: [
        { role: 'system', content: 'You are a product spec lookup assistant. Return only valid JSON, no markdown, no explanation.' },
        { role: 'user', content: userPrompt },
      ],
    })
  }

  try {
    let response
    try {
      response = await callModel('compound-beta-mini')
    } catch (err1) {
      console.warn('compound-beta-mini failed, falling back to llama-3.3-70b-versatile:', err1.message)
      response = await callModel('llama-3.3-70b-versatile')
    }

    const raw = response.choices[0]?.message?.content?.trim() ?? '[]'
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const variants = JSON.parse(jsonStr)

    return res.status(200).json({ variants })
  } catch (err) {
    console.error('fetch-variants error:', err)
    return res.status(500).json({ error: err.message })
  }
}
