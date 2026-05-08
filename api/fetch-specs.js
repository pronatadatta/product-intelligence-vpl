const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SPEC_SCHEMA = `Return ONLY a JSON object with exactly these keys (no extras). Use null for unknown/not applicable.

{
  "display": {
    "Screen Type": "<string or null>",
    "Always-on Display": <true|false|null>,
    "Touchscreen": <true|false|null>
  },
  "durability": {
    "Water Resistance": "<string or null>",
    "Build Material": "<string or null>",
    "Scratch-resistant Glass": <true|false|null>,
    "Military-grade Certified": <true|false|null>
  },
  "gps": {
    "Built-in GPS": <true|false|null>,
    "Multi-band GPS": <true|false|null>,
    "Offline Maps": <true|false|null>
  },
  "battery": {
    "Daily Battery Life": "<string or null>",
    "GPS Mode Battery Life": "<string or null>",
    "Solar Charging": <true|false|null>
  },
  "health": {
    "Heart Rate Monitor": <true|false|null>,
    "Blood Oxygen / SpO2": <true|false|null>,
    "ECG": <true|false|null>,
    "Sleep Tracking": <true|false|null>,
    "Stress Tracking": <true|false|null>,
    "Skin Temperature": <true|false|null>,
    "Recovery Metrics": <true|false|null>
  },
  "sports": {
    "Number of Sport Profiles": "<string or null>",
    "Running": <true|false|null>,
    "Swimming": <true|false|null>,
    "Cycling": <true|false|null>,
    "Golf": <true|false|null>
  },
  "connectivity": {
    "Contactless Payments": <true|false|null>,
    "Music Storage": <true|false|null>,
    "Phone Notifications": <true|false|null>,
    "LTE / Cellular": <true|false|null>
  },
  "extra_features": []
}

For extra_features: if you find any notable feature NOT in the schema above (e.g. flashlight, satellite messaging, dive computer), add objects like:
{ "name": "Feature Name", "value": true, "type": "boolean" }
or
{ "name": "Feature Name", "value": "some text", "type": "text" }

Be specific with text values (e.g. "ATM10 / 100m" not just "waterproof"). Use current official specs.`

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, brand, model, variant, size } = req.body
  if (!name && !model) return res.status(400).json({ error: 'product name required' })

  const productLabel = [brand, model, variant, size].filter(Boolean).join(' ')

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
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
