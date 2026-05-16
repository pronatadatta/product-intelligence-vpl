import { useState, useMemo, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const BB_BLUE = '#0046BE'

const CHART_COLORS = [
  '#e63946', '#2196f3', '#2a9d8f', '#f4a261', '#7209b7',
  '#ff9f1c', '#06d6a0', '#ef476f', '#3a86ff', '#fb8500',
  '#8338ec', '#52b788', '#e9c46a', '#457b9d', '#d62828',
]

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getWeekStart(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function getBucketKey(loggedAt, range) {
  const d = new Date(loggedAt)
  if (range === 'daily') return d.toISOString().slice(0, 10)
  if (range === 'weekly') return getWeekStart(d).toISOString().slice(0, 10)
  if (range === 'monthly') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return String(d.getFullYear())
}

function formatBucketLabel(bucketKey, range) {
  if (range === 'yearly') return bucketKey
  const d = new Date(bucketKey + (range === 'monthly' ? '-01T00:00:00' : 'T00:00:00'))
  if (range === 'daily') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (range === 'weekly') {
    const end = new Date(d)
    end.setDate(d.getDate() + 6)
    const startStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = d.getMonth() === end.getMonth()
      ? end.getDate()
      : end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${startStr}–${endStr}`
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function filterLogsByRange(logs, range) {
  const cutoff = new Date()
  if (range === 'daily') cutoff.setDate(cutoff.getDate() - 30)
  else if (range === 'weekly') cutoff.setDate(cutoff.getDate() - 84)
  else if (range === 'monthly') cutoff.setMonth(cutoff.getMonth() - 12)
  else cutoff.setFullYear(cutoff.getFullYear() - 5)
  return logs.filter(l => new Date(l.logged_at) >= cutoff)
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function getGroupKey(log, variantMap, drilldown) {
  if (log.custom_product) return log.custom_product
  const v = variantMap[log.variant_id]
  if (!v) return 'Unknown'
  if (drilldown === 'product') return `${v.product.brand} ${v.product.model}`
  if (drilldown === 'variant') return [v.product.brand, v.product.model, v.color].filter(Boolean).join(' · ')
  return v.size || `${v.product.brand} ${v.product.model}`
}

function buildChartData(logs, variantMap, range, drilldown) {
  const filtered = filterLogsByRange(logs, range)
  const bucketMap = {}
  const groupKeys = new Set()

  for (const log of filtered) {
    const bk = getBucketKey(log.logged_at, range)
    const gk = getGroupKey(log, variantMap, drilldown)
    groupKeys.add(gk)
    if (!bucketMap[bk]) bucketMap[bk] = { date: formatBucketLabel(bk, range) }
    bucketMap[bk][gk] = (bucketMap[bk][gk] || 0) + 1
  }

  const data = Object.keys(bucketMap).sort().map(bk => bucketMap[bk])
  return { data, groups: [...groupKeys].sort() }
}

function getTopThisWeek(logs, variantMap, n) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const counts = {}
  for (const log of logs) {
    if (new Date(log.logged_at) < cutoff) continue
    if (log.custom_product) {
      const key = `custom:${log.custom_product}`
      if (!counts[key]) counts[key] = { count: 0, customProduct: log.custom_product }
      counts[key].count++
    } else {
      const v = variantMap[log.variant_id]
      if (!v) continue
      const key = `${v.product.brand}||${v.product.model}||${v.variant || ''}`
      if (!counts[key]) counts[key] = { count: 0, variant: v }
      counts[key].count++
    }
  }
  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

function getRecentlyLogged(logs, variantMap, n) {
  const seen = new Set()
  const result = []
  const sorted = [...logs].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at))
  for (const log of sorted) {
    if (log.custom_product) {
      if (seen.has(log.custom_product)) continue
      seen.add(log.custom_product)
      result.push({ customProduct: log.custom_product })
    } else {
      const key = `${log.variant_id}||${variantMap[log.variant_id]?.variant || ''}`
      if (seen.has(key)) continue
      seen.add(key)
      const v = variantMap[log.variant_id]
      if (v) result.push({ variant: v, variant_id: log.variant_id })
    }
    if (result.length >= n) break
  }
  return result
}

function chipLabel(v) {
  const parts = [v.product.brand, v.product.model]
  if (v.color) parts.push(v.color)
  return parts.join(' · ')
}

// ─── TrackerLogSheet ──────────────────────────────────────────────────────────

function TrackerLogSheet({ variants, logs, onClose, onSubmit, preselect }) {
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState(preselect?.brand ?? '')
  const [model, setModel] = useState(preselect?.model ?? '')
  const [variantText, setVariantText] = useState(preselect?.variant ?? '')
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successLabel, setSuccessLabel] = useState('')
  const [customMode, setCustomMode] = useState(preselect?.customMode ?? false)
  const [customProduct, setCustomProduct] = useState(preselect?.customProduct ?? '')

  const variantMap = useMemo(() => Object.fromEntries(variants.map(v => [v.id, v])), [variants])

  const brands = useMemo(() => [...new Set(variants.map(v => v.product.brand))].sort(), [variants])

  const models = useMemo(() => {
    if (!brand) return []
    return [...new Set(variants.filter(v => v.product.brand === brand).map(v => v.product.model))].sort()
  }, [variants, brand])

  const variantTexts = useMemo(() => {
    if (!model) return []
    return [...new Set(
      variants.filter(v => v.product.brand === brand && v.product.model === model).map(v => v.variant).filter(Boolean)
    )].sort()
  }, [variants, brand, model])

  const colors = useMemo(() => {
    if (!model) return []
    return [...new Set(
      variants
        .filter(v =>
          v.product.brand === brand &&
          v.product.model === model &&
          (variantTexts.length === 0 || v.variant === variantText)
        )
        .map(v => v.color)
        .filter(Boolean)
    )].sort()
  }, [variants, brand, model, variantText, variantTexts])

  const sizes = useMemo(() => {
    if (!color) return []
    return [...new Set(
      variants
        .filter(v =>
          v.product.brand === brand &&
          v.product.model === model &&
          (variantTexts.length === 0 || v.variant === variantText) &&
          v.color === color
        )
        .map(v => v.size)
        .filter(Boolean)
    )].sort((a, b) => {
      const na = parseFloat(String(a).match(/[\d.]+/)?.[0] ?? '')
      const nb = parseFloat(String(b).match(/[\d.]+/)?.[0] ?? '')
      return (!isNaN(na) && !isNaN(nb)) ? na - nb : String(a).localeCompare(String(b))
    })
  }, [variants, brand, model, variantText, color, variantTexts])

  const needsSize = sizes.length > 0

  const matched = useMemo(() => {
    if (!color) return null
    if (needsSize && !size) return null
    return variants.find(v =>
      v.product.brand === brand &&
      v.product.model === model &&
      (variantTexts.length === 0 || v.variant === variantText) &&
      v.color === color &&
      (!needsSize || v.size === size)
    ) ?? null
  }, [variants, brand, model, variantText, color, size, needsSize, variantTexts])

  // Valid when model is selected but no color — allows submitting without a specific color
  const partialMatch = useMemo(() => {
    if (!model) return null
    if (variantTexts.length > 0 && !variantText) return null
    return { brand, model, variant: variantText }
  }, [brand, model, variantText, variantTexts])

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    const seen = new Set()
    return variants.filter(v => {
      const key = `${v.product.brand}|${v.product.model}|${v.variant}|${v.color}`
      if (seen.has(key)) return false
      seen.add(key)
      return (
        v.product.brand.toLowerCase().includes(q) ||
        v.product.model.toLowerCase().includes(q) ||
        (v.variant || '').toLowerCase().includes(q) ||
        (v.color || '').toLowerCase().includes(q)
      )
    }).slice(0, 8)
  }, [variants, search])

  const topThisWeek = useMemo(() => getTopThisWeek(logs, variantMap, 5), [logs, variantMap])
  const recentlyLogged = useMemo(() => getRecentlyLogged(logs, variantMap, 5), [logs, variantMap])

  function preselectVariant(v) {
    setSearch('')
    setBrand(v.product.brand)
    setModel(v.product.model)
    setVariantText(v.variant || '')
    setColor(v.color || '')
    setSize('')
    setCustomMode(false)
  }

  function preselectCustom(productName) {
    setCustomMode(true)
    setCustomProduct(productName)
    reset()
  }

  function reset() {
    setBrand(''); setModel(''); setVariantText(''); setColor(''); setSize(''); setNotes(''); setSearch('')
  }

  async function handleSubmit() {
    if (customMode ? !customProduct.trim() : !matched && !partialMatch) return
    setSubmitting(true)
    try {
      let variantId = null
      let customStr = null
      let label = ''
      if (customMode) {
        customStr = customProduct.trim()
        label = customStr
      } else if (matched) {
        variantId = matched.id
        label = [matched.product.brand, matched.product.model, matched.color, matched.size].filter(Boolean).join(' · ')
      } else {
        customStr = [partialMatch.brand, partialMatch.model, partialMatch.variant].filter(Boolean).join(' ')
        label = customStr
      }
      await onSubmit(variantId, notes.trim() || null, customStr)
      setSuccessLabel(label)
      setSuccess(true)
      setTimeout(onClose, 1400)
    } catch (err) {
      console.error(err)
      setSubmitting(false)
    }
  }

  const sel = `border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none w-full rounded-xl`

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
        <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl px-6 py-10 flex flex-col items-center gap-3">
          <span className="text-5xl" style={{ color: BB_BLUE }}>✓</span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">Logged</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{successLabel}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Log Demand</h2>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-8 flex flex-col gap-4">

          {/* Search */}
          {!customMode && <div className="relative">
            <input
              type="text"
              placeholder="Search product, brand, color…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">×</button>
            )}
          </div>}

          {/* Search results */}
          {!customMode && search && searchResults.length > 0 && (
            <div className="flex flex-col gap-1 -mt-2">
              {searchResults.map(v => (
                <button
                  key={v.id}
                  onClick={() => preselectVariant(v)}
                  className="text-left px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                >
                  <span className="font-medium">{v.product.brand} {v.product.model}</span>
                  {v.variant && <span className="text-gray-500"> · {v.variant}</span>}
                  {v.color && <span className="text-gray-500"> · {v.color}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Quick shortcuts */}
          {!customMode && !search && (
            <>
              {topThisWeek.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Most requested this week</p>
                  <div className="flex flex-wrap gap-2">
                    {topThisWeek.map(({ variant: v, count, customProduct: cp }) => (
                      <button
                        key={cp || v.id}
                        onClick={() => cp ? preselectCustom(cp) : preselectVariant(v)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      >
                        {cp || chipLabel(v)}
                        <span className="ml-1 text-gray-400">×{count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {recentlyLogged.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Recently logged</p>
                  <div className="flex flex-wrap gap-2">
                    {recentlyLogged.map(({ variant: v, variant_id, customProduct: cp }) => (
                      <button
                        key={cp || variant_id}
                        onClick={() => cp ? preselectCustom(cp) : preselectVariant(v)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      >
                        {cp || chipLabel(v)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Custom product toggle */}
          <button
            onClick={() => { setCustomMode(m => !m); setCustomProduct(''); reset() }}
            className="w-full rounded-xl py-3 text-sm font-semibold border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
          >
            {customMode ? '← Back to product list' : '+ Product not in the list?'}
          </button>

          {/* Custom product input */}
          {customMode && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Product name</label>
              <input
                type="text"
                value={customProduct}
                onChange={e => setCustomProduct(e.target.value)}
                placeholder="e.g. Garmin Fenix 9, Whoop 5.0 Pro…"
                autoFocus
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1.5">This will be tracked as a new demand signal.</p>
            </div>
          )}

          {/* Cascading dropdowns */}
          {!customMode && <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Brand</label>
              <select value={brand} onChange={e => { setBrand(e.target.value); setModel(''); setVariantText(''); setColor(''); setSize('') }} className={sel}>
                <option value="">Select brand…</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {brand && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Model</label>
                <select value={model} onChange={e => { setModel(e.target.value); setVariantText(''); setColor(''); setSize('') }} className={sel}>
                  <option value="">Select model…</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}

            {model && variantTexts.length > 0 && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Variant</label>
                <select value={variantText} onChange={e => { setVariantText(e.target.value); setColor(''); setSize('') }} className={sel}>
                  <option value="">Select variant…</option>
                  {variantTexts.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                </select>
              </div>
            )}

            {model && (variantTexts.length === 0 || variantText) && colors.length > 0 && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Color <span className="normal-case font-normal">(optional)</span></label>
                <select value={color} onChange={e => { setColor(e.target.value); setSize('') }} className={sel}>
                  <option value="">Select color…</option>
                  {colors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {needsSize && color && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Size</label>
                <select value={size} onChange={e => setSize(e.target.value)} className={sel}>
                  <option value="">Select size…</option>
                  {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>}

          {/* Selected product summary */}
          {!customMode && (matched || partialMatch) && (
            <div className="rounded-xl border-2 p-3 flex items-start justify-between gap-3" style={{ borderColor: BB_BLUE }}>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  {matched
                    ? `${matched.product.brand} ${matched.product.model}${matched.variant ? ` · ${matched.variant}` : ''}`
                    : `${partialMatch.brand} ${partialMatch.model}${partialMatch.variant ? ` · ${partialMatch.variant}` : ''}`}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {matched ? [matched.color, matched.size].filter(Boolean).join(' · ') : 'Any color'}
                </p>
              </div>
              <button onClick={reset} className="text-xs text-gray-400 shrink-0">Reset</button>
            </div>
          )}

          {/* Notes */}
          {(matched || partialMatch || customMode) && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. customer wanted rose gold specifically"
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl py-4 text-sm font-bold text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={customMode ? !customProduct.trim() || submitting : (!matched && !partialMatch) || submitting}
              className="flex-1 rounded-xl py-4 text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: BB_BLUE }}
            >
              {submitting ? 'Logging…' : 'Log Demand'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── DemandGraph ──────────────────────────────────────────────────────────────

function DemandGraph({ logs, variantMap }) {
  const [range, setRange] = useState('weekly')
  const [drilldown, setDrilldown] = useState('product')
  const [focusGroup, setFocusGroup] = useState(null)

  const { data, groups } = useMemo(
    () => buildChartData(logs, variantMap, range, drilldown),
    [logs, variantMap, range, drilldown]
  )

  const displayGroups = focusGroup ? groups.filter(g => g === focusGroup) : groups

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📊</p>
        <p className="text-sm">No demand data yet.</p>
        <p className="text-xs mt-1">Log some demand to see trends here.</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-2 pb-4">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {[['daily', 'Day'], ['weekly', 'Wk'], ['monthly', 'Mo'], ['yearly', 'Yr']].map(([r, label]) => (
            <button
              key={r}
              onClick={() => { setRange(r); setFocusGroup(null) }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${range === r ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {[['product', 'Product'], ['variant', 'Color'], ['size', 'Size']].map(([d, label]) => (
            <button
              key={d}
              onClick={() => { setDrilldown(d); setFocusGroup(null) }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${drilldown === d ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {focusGroup && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-600 dark:text-gray-300">Showing: <strong>{focusGroup}</strong></span>
          <button onClick={() => setFocusGroup(null)} className="text-xs underline text-gray-400">Show all</button>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '12px' }}
          />
          {displayGroups.map((g, i) => (
            <Area
              key={g}
              type="monotone"
              dataKey={g}
              stackId="1"
              stroke={CHART_COLORS[groups.indexOf(g) % CHART_COLORS.length]}
              fill={CHART_COLORS[groups.indexOf(g) % CHART_COLORS.length]}
              fillOpacity={0.65}
              strokeWidth={1.5}
              onClick={() => setFocusGroup(focusGroup === g ? null : g)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 max-h-20 overflow-y-auto">
        {groups.map((g, i) => (
          <button
            key={g}
            onClick={() => setFocusGroup(focusGroup === g ? null : g)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${focusGroup && focusGroup !== g ? 'opacity-30' : ''}`}
          >
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-gray-700 dark:text-gray-300">{g}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── TrackerView ──────────────────────────────────────────────────────────────

function RecentLogs({ logs, variantMap, onDelete }) {
  const [confirmId, setConfirmId] = useState(null)
  const recent = logs.slice(0, 20)

  if (recent.length === 0) return null

  function logLabel(log) {
    if (log.custom_product) return log.custom_product
    const v = variantMap[log.variant_id]
    if (!v) return 'Unknown'
    return [v.product.brand, v.product.model, v.color, v.size].filter(Boolean).join(' · ')
  }

  function formatTime(ts) {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now - d
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    return `${diffDay}d ago`
  }

  return (
    <div className="px-4 pb-6">
      <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Recent Logs</h2>
      <div className="flex flex-col gap-2">
        {recent.map(log => (
          <div key={log.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{logLabel(log)}</p>
              {log.notes && <p className="text-[10px] text-gray-400 truncate mt-0.5">{log.notes}</p>}
              <p className="text-[10px] text-gray-400 mt-0.5">{formatTime(log.logged_at)}</p>
            </div>
            {confirmId === log.id ? (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setConfirmId(null)} className="text-xs text-gray-400 px-2 py-1">Keep</button>
                <button
                  onClick={() => { onDelete(log.id); setConfirmId(null) }}
                  className="text-xs font-semibold text-white px-2 py-1 rounded-lg bg-red-500"
                >
                  Delete
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmId(log.id)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm shrink-0">✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── DraggableFAB ─────────────────────────────────────────────────────────────

function DraggableFAB({ onClick }) {
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('fab-pos')
      if (saved) return JSON.parse(saved)
    } catch {}
    return { x: window.innerWidth - 72, y: window.innerHeight - 140 }
  })

  const posRef = useRef(pos)
  const startPointer = useRef({ x: 0, y: 0 })
  const startPos = useRef({ x: 0, y: 0 })
  const moved = useRef(false)
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  const moveHandler = useRef((e) => {
    const dx = e.clientX - startPointer.current.x
    const dy = e.clientY - startPointer.current.y
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved.current = true
    const newX = Math.max(0, Math.min(window.innerWidth - 56, startPos.current.x + dx))
    const newY = Math.max(0, Math.min(window.innerHeight - 56, startPos.current.y + dy))
    posRef.current = { x: newX, y: newY }
    setPos({ x: newX, y: newY })
  })

  const upHandler = useRef(() => {
    window.removeEventListener('pointermove', moveHandler.current)
    window.removeEventListener('pointerup', upHandler.current)
    if (!moved.current) {
      onClickRef.current()
    } else {
      localStorage.setItem('fab-pos', JSON.stringify(posRef.current))
    }
  })

  function onPointerDown(e) {
    e.preventDefault()
    moved.current = false
    startPointer.current = { x: e.clientX, y: e.clientY }
    startPos.current = { ...posRef.current }
    window.addEventListener('pointermove', moveHandler.current)
    window.addEventListener('pointerup', upHandler.current)
  }

  return (
    <button
      onPointerDown={onPointerDown}
      style={{ position: 'fixed', left: pos.x, top: pos.y, background: BB_BLUE, touchAction: 'none' }}
      className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white text-3xl font-light z-10 select-none"
      aria-label="Log demand"
    >
      +
    </button>
  )
}

export default function TrackerView({ variants, logs, onSubmitLog, onDeleteLog }) {
  const [showSheet, setShowSheet] = useState(false)
  const [preselect, setPreselect] = useState(null)

  const variantMap = useMemo(() => Object.fromEntries(variants.map(v => [v.id, v])), [variants])
  const topThisWeek = useMemo(() => getTopThisWeek(logs, variantMap, 6), [logs, variantMap])

  function openSheet(preselectData = null) {
    setPreselect(preselectData)
    setShowSheet(true)
  }

  function closeSheet() {
    setShowSheet(false)
    setPreselect(null)
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-y-auto pb-40">

        {/* Quick Log */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Quick Log</h2>
            <span className="text-xs text-gray-400">This week's top</span>
          </div>
          {topThisWeek.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nothing logged this week yet. Tap + to start.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {topThisWeek.map(({ variant: v, count, customProduct: cp }) => (
                <button
                  key={cp || `${v.product.brand}|${v.product.model}|${v.variant}`}
                  onClick={() => cp
                    ? openSheet({ customMode: true, customProduct: cp })
                    : openSheet({ brand: v.product.brand, model: v.product.model, variant: v.variant || '' })}
                  className="text-left p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 active:scale-95 transition-transform"
                >
                  {cp ? (
                    <>
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">Unknown</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: BB_BLUE }}>×{count}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">{cp}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{v.product.brand}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: BB_BLUE }}>×{count}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">{v.product.model}</p>
                      {v.variant && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{v.variant}</p>}
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 mx-4 my-3" />

        {/* Demand graph */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white px-4 mb-1">Demand Trends</h2>
          <DemandGraph logs={logs} variantMap={variantMap} />
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 mx-4 my-3" />

        {/* Recent logs with delete */}
        <RecentLogs logs={logs} variantMap={variantMap} onDelete={onDeleteLog} />
      </div>

      {/* FAB */}
      <DraggableFAB onClick={() => openSheet(null)} />

      {showSheet && (
        <TrackerLogSheet
          variants={variants}
          logs={logs}
          preselect={preselect}
          onClose={closeSheet}
          onSubmit={onSubmitLog}
        />
      )}
    </>
  )
}
