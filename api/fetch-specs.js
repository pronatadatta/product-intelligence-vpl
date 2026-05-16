const Groq = require('groq-sdk')

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SPEC_SCHEMA = `Return ONLY a JSON object with exactly these keys (no extras). Use null for unknown/not applicable.

{
  "Display Type": "<string or null>",
  "Screen Size": "<string or null>",
  "Screen Material": "<string or null>",
  "Case Size": "<string or null>",
  "Case Material": "<string or null>",
  "Built-in Storage": "<string or null>",
  "Built-in GPS": "<string or null — describe GPS capability, e.g. 'Yes (multi-band)', 'No', 'Connected GPS via phone'>",
  "Max Water Resistance": "<string or null>",
  "Usage Time (Battery)": "<string or null>",
  "Wireless Connectivity": "<string or null>",
  "Voice Assistant": "<string or null>",
  "Sensors": "<string or null>",
  "Metrics Measured": "<string or null>",
  "US Release Date": "<string or null>"
}

Be specific with text values. For "Sensors" and "Metrics Measured", return comma-separated lists. For "US Release Date" use YYYY-MM-DD format.`

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, brand, model, variant, size } = req.body
  if (!name && !model) return res.status(400).json({ error: 'product name required' })

  const productLabel = [brand, model, variant, size].filter(Boolean).join(' ')

  try {
    const model = req.body.noSearch ? 'llama-3.3-70b-versatile' : 'compound-beta'

    const response = await client.chat.completions.create({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: 'You are a product spec lookup assistant. Return only valid JSON, no markdown, no explanation.',
        },
        {
          role: 'user',
          content: `Look up the official specs for the ${productLabel}.\n\n${SPEC_SCHEMA}\n\nProduct: ${productLabel}\nReturn ONLY the JSON object, no markdown, no explanation.`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content?.trim() ?? ''
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const specs = JSON.parse(jsonStr)

    return res.status(200).json({ specs })
  } catch (err) {
    console.error('fetch-specs error:', err)
    return res.status(500).json({ error: err.message })
  }
}
