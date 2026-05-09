const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SPEC_SCHEMA = `Return ONLY a JSON object with exactly these keys (no extras). Use null for unknown/not applicable.

{
  "Display Type": "<string or null>",
  "Screen Size": "<string or null>",
  "Screen Material": "<string or null>",
  "Case Size": "<string or null>",
  "Case Material": "<string or null>",
  "Built-in Storage": "<string or null>",
  "Built-in GPS": <true|false|null>,
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
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: req.body.noSearch ? undefined : [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1 }],
      messages: [
        {
          role: 'user',
          content: `Look up the official specs for the ${productLabel}. Use web search to get accurate, current specifications.

${SPEC_SCHEMA}

Product: ${productLabel}
Return ONLY the JSON object, no markdown, no explanation.`,
        },
      ],
    })

    const textBlock = response.content.findLast(b => b.type === 'text')
    if (!textBlock) return res.status(500).json({ error: 'No text response from Claude' })

    const raw = textBlock.text.trim()
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const specs = JSON.parse(jsonStr)

    return res.status(200).json({ specs })
  } catch (err) {
    console.error('fetch-specs error:', err)
    return res.status(500).json({ error: err.message })
  }
}
