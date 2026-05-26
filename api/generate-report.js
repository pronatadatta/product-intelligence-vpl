module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { timePeriodLabel, periodStart, periodEnd, totalLogs, demandData } = req.body
  if (!demandData) return res.status(400).json({ error: 'demandData required' })

  const SYSTEM_PROMPT =
    'You are a retail analytics assistant helping a Best Buy Vendor Program Lead generate a professional demand report email for their manager and corporate team. Write clearly, concisely, and professionally. No fluff. Focus on actionable insights. Always generate a report regardless of how much data is available.'

  const dataRows = demandData.length
    ? demandData
        .map((row, i) => {
          const name = [row.brand, row.product_name].filter(Boolean).join(' ')
          const detail = [row.variant, row.color, row.size].filter(Boolean).join(' · ')
          const dateRange =
            row.first_requested === row.last_requested
              ? row.first_requested
              : `${row.first_requested} to ${row.last_requested}`
          const notes = row.notes ? ` [Notes: ${row.notes}]` : ''
          return `${i + 1}. ${name}${detail ? ` — ${detail}` : ''}: ${row.demand_count} request${row.demand_count !== 1 ? 's' : ''} (${dateRange})${notes}`
        })
        .join('\n')
    : 'No specific variant demand data recorded for this period.'

  const USER_PROMPT = `Generate a professional demand report email for the following time period: ${timePeriodLabel}
Date range: ${periodStart} to ${periodEnd}
Total demand entries logged: ${totalLogs}

Here is the raw demand data from the sales floor:
${dataRows}

The email must include:
1. Subject line: Demand Report — Wearables | [Date Range]
2. Brief intro (1-2 sentences). If data is limited acknowledge naturally e.g. Early data from this period shows... Never refuse to generate due to low data volume.
3. TOP DEMANDED PRODUCTS — ranked list with product name, variant, color, size, demand count, date range. For Oura Ring always break down by color AND size.
4. RESTOCK RECOMMENDATIONS — highest demand products that need restocking, call out specific colors and sizes. If limited data frame as early signals.
5. NOTABLE PATTERNS — trends worth flagging. If limited data note what to watch.
6. Brief closing line. Professional and direct. This email may go to corporate.

If data is limited acknowledge it naturally in the intro and still provide whatever insights are possible framed as early signals. Never refuse to generate.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return res.status(500).json({ error: err.error?.message || `Groq API error: ${response.status}` })
    }

    const data = await response.json()
    const email = data.choices[0]?.message?.content?.trim() ?? ''
    return res.status(200).json({ email })
  } catch (err) {
    console.error('generate-report error:', err)
    return res.status(500).json({ error: err.message })
  }
}
