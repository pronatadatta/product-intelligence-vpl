module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { timePeriodLabel, periodStart, periodEnd, totalLogs, demandData } = req.body
  if (!demandData) return res.status(400).json({ error: 'demandData required' })

  const SYSTEM_PROMPT =
    'You are a Best Buy Vendor Program Lead writing a demand report email to your manager. Write in a natural, human tone. Keep it concise and direct. Never use em dashes (—). Use a middle dot (·) to separate product details. Write like a real person, not a report generator.'

  const dataRows = demandData.length
    ? demandData
        .map((row, i) => {
          const name = [row.brand, row.product_name].filter(Boolean).join(' ')
          const detail = [row.variant, row.color, row.size].filter(Boolean).join(' / ')
          const dateRange =
            row.first_requested === row.last_requested
              ? row.first_requested
              : `${row.first_requested} to ${row.last_requested}`
          const notes = row.notes ? ` [${row.notes}]` : ''
          return `${i + 1}. ${name}${detail ? ` · ${detail}` : ''}: ${row.demand_count} request${row.demand_count !== 1 ? 's' : ''} (${dateRange})${notes}`
        })
        .join('\n')
    : 'No specific variant demand data recorded for this period.'

  const USER_PROMPT = `Write a demand report email using exactly this format and style. Copy the structure precisely.

---EXAMPLE FORMAT---
Subject: Demand Report Wearables | May 15 to May 25

 This report highlights the top demanded products and restock recommendations

**TOP DEMANDED PRODUCTS:**
1. Whoop Life (MG) · Obsidian / SuperKnit Luxe: 7 requests (May 16 to May 24)
2. Garmin Forerunner 165 Non-Music · Black/Slate Gray: 5 requests (May 17 to May 22)
3. Garmin Vivoactive 6 42mm · Lunar Gold: 4 requests (May 16 to May 24)

**RESTOCK RECOMMENDATIONS:**
I recommend restocking the following products:
- Whoop Life (MG) · Obsidian / SuperKnit Luxe
- Garmin Forerunner 165 Non-Music · Black/Slate Gray
- Oura Ring 4 Titanium · Silver · Size 6 and Size 8, as these sizes have shown demand and are currently not fully stocked.

**NOTABLE PATTERNS:**
I see a high demand for Garmin Forerunner series and Oura Ring 4 in various sizes and colors. The data also suggests a preference for black, gray, and silver colors. As more data becomes available, it will be essential to monitor these trends and adjust inventory accordingly.
---END EXAMPLE---

Rules:
- Never use em dashes (—) anywhere in the output
- Use · to separate product name from color/size details
- Use / to separate multiple colors or variants within a detail
- Subject line format: Demand Report Wearables | ${periodStart} to ${periodEnd}
- Intro is exactly one short sentence, no fluff
- Section headers use **bold** with a colon at the end
- RESTOCK RECOMMENDATIONS starts with "I recommend restocking the following products:"
- NOTABLE PATTERNS is a short conversational paragraph written in first person (I see, I notice, etc.)
- No closing line or sign-off
- Always generate the full report regardless of how much data there is
- If data is limited, frame insights as early signals naturally

Time period: ${timePeriodLabel}
Date range: ${periodStart} to ${periodEnd}
Total entries logged: ${totalLogs}

Demand data from the sales floor:
${dataRows}`

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
