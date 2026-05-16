const Groq = require('groq-sdk')

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { products, specName, specType } = req.body
  if (!products?.length || !specName) return res.status(400).json({ error: 'products and specName required' })

  const productList = products.map((p, i) => `${i + 1}. ${p.name}`).join('\n')

  const prompt = specType === 'boolean'
    ? `For each product below, does it have "${specName}"? Answer with ONLY a JSON object mapping product number to true, false, or null (null = unknown/unclear).

${productList}

Example: {"1": true, "2": false, "3": null}
Return ONLY the JSON object.`
    : `For each product below, what is the "${specName}" value? Answer with ONLY a JSON object mapping product number to a string value or null.

${productList}

Example: {"1": "some value", "2": "other value", "3": null}
Return ONLY the JSON object.`

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 512,
      messages: [
        {
          role: 'system',
          content: 'You are a product spec lookup assistant. Return only valid JSON, no markdown, no explanation.',
        },
        { role: 'user', content: prompt },
      ],
    })

    const raw = response.choices[0]?.message?.content?.trim() ?? '{}'
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const result = JSON.parse(jsonStr)

    const mapped = {}
    products.forEach((p, i) => {
      const val = result[String(i + 1)]
      mapped[p.id] = val === undefined ? null : val
    })

    return res.status(200).json({ results: mapped })
  } catch (err) {
    console.error('batch-check error:', err)
    return res.status(500).json({ error: err.message })
  }
}
