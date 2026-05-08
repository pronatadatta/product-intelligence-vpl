import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase ────────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

// ─── Constants ───────────────────────────────────────────────────────────────
const BB_BLUE = '#0046BE'
const MAX_COMPARE = 5

const SPEC_CATEGORIES = [
  {
    key: 'display',
    label: 'Display',
    specs: [
      { name: 'Screen Type', type: 'text' },
      { name: 'Always-on Display', type: 'boolean' },
      { name: 'Touchscreen', type: 'boolean' },
    ],
  },
  {
    key: 'durability',
    label: 'Durability',
    specs: [
      { name: 'Water Resistance', type: 'text' },
      { name: 'Build Material', type: 'text' },
      { name: 'Scratch-resistant Glass', type: 'boolean' },
      { name: 'Military-grade Certified', type: 'boolean' },
    ],
  },
  {
    key: 'gps',
    label: 'GPS',
    specs: [
      { name: 'Built-in GPS', type: 'boolean' },
      { name: 'Multi-band GPS', type: 'boolean' },
      { name: 'Offline Maps', type: 'boolean' },
    ],
  },
  {
    key: 'battery',
    label: 'Battery',
    specs: [
      { name: 'Daily Battery Life', type: 'text' },
      { name: 'GPS Mode Battery Life', type: 'text' },
      { name: 'Solar Charging', type: 'boolean' },
    ],
  },
  {
    key: 'health',
    label: 'Health & Training',
    specs: [
      { name: 'Heart Rate Monitor', type: 'boolean' },
      { name: 'Blood Oxygen / SpO2', type: 'boolean' },
      { name: 'ECG', type: 'boolean' },
      { name: 'Sleep Tracking', type: 'boolean' },
      { name: 'Stress Tracking', type: 'boolean' },
      { name: 'Skin Temperature', type: 'boolean' },
      { name: 'Recovery Metrics', type: 'boolean' },
    ],
  },
  {
    key: 'sports',
    label: 'Sports Modes',
    specs: [
      { name: 'Number of Sport Profiles', type: 'text' },
      { name: 'Running', type: 'boolean' },
      { name: 'Swimming', type: 'boolean' },
      { name: 'Cycling', type: 'boolean' },
      { name: 'Golf', type: 'boolean' },
    ],
  },
  {
    key: 'connectivity',
    label: 'Connectivity',
    specs: [
      { name: 'Contactless Payments', type: 'boolean' },
      { name: 'Music Storage', type: 'boolean' },
      { name: 'Phone Notifications', type: 'boolean' },
      { name: 'LTE / Cellular', type: 'boolean' },
    ],
  },
]

const BUILT_IN_SPEC_NAMES = new Set(
  SPEC_CATEGORIES.flatMap(c => c.specs.map(s => s.name)),
)

const INITIAL_CATALOG = [
  { brand: 'Oura', model: 'Ring', variant: 'Titanium', category: 'Wearables' },
  { brand: 'Oura', model: 'Ring', variant: 'Ceramic', category: 'Wearables' },
  { brand: 'Garmin', model: 'Forerunner 165', variant: '', category: 'Wearables' },
  { brand: 'Garmin', model: 'Forerunner 265', variant: '', category: 'Wearables' },
  { brand: 'Garmin', model: 'Forerunner 570', variant: '', category: 'Wearables' },
  { brand: 'Garmin', model: 'Forerunner 965', variant: '', category: 'Wearables' },
  { brand: 'Garmin', model: 'Forerunner 970', variant: '', category: 'Wearables' },
  { brand: 'Garmin', model: 'Instinct 3', variant: 'AMOLED', category: 'Wearables' },
  { brand: 'Garmin', model: 'Instinct 3', variant: 'Solar', category: 'Wearables' },
  { brand: 'Garmin', model: 'Instinct 3', variant: 'Tactical', category: 'Wearables' },
  { brand: 'Garmin', model: 'Vivoactive 5', variant: '', category: 'Wearables' },
  { brand: 'Garmin', model: 'Vivoactive 6', variant: '', category: 'Wearables' },
  { brand: 'Garmin', model: 'Venu 3', variant: '', category: 'Wearables' },
  { brand: 'Garmin', model: 'Venu 3S', variant: '', category: 'Wearables' },
  { brand: 'Garmin', model: 'Venu 4', variant: '', category: 'Wearables' },
  { brand: 'Garmin', model: 'Venu X1', variant: '', category: 'Wearables' },
  { brand: 'Garmin', model: 'Fenix 8', variant: '', category: 'Wearables' },
  { brand: 'Whoop', model: 'One', variant: '', category: 'Wearables' },
  { brand: 'Whoop', model: 'Peak', variant: '', category: 'Wearables' },
  { brand: 'Whoop', model: 'Life', variant: '', category: 'Wearables' },
  { brand: 'Samsung', model: 'Watch 7', variant: '', category: 'Wearables' },
  { brand: 'Samsung', model: 'Watch 8', variant: '', category: 'Wearables' },
  { brand: 'Samsung', model: 'Watch 8 Classic', variant: '', category: 'Wearables' },
  { brand: 'Samsung', model: 'Watch 8 Ultra', variant: '', category: 'Wearables' },
  { brand: 'Samsung', model: 'Ring', variant: '', category: 'Wearables' },
  { brand: 'Apple', model: 'Watch SE3', variant: '', category: 'Wearables' },
  { brand: 'Apple', model: 'Watch Series 11', variant: '', category: 'Wearables' },
  { brand: 'Apple', model: 'Watch Ultra 3', variant: '', category: 'Wearables' },
  { brand: 'Amazfit', model: 'BIP 6', variant: '', category: 'Wearables' },
  { brand: 'Amazfit', model: 'Active 2', variant: '', category: 'Wearables' },
  { brand: 'Amazfit', model: 'Balance 2 XT', variant: '', category: 'Wearables' },
  { brand: 'Amazfit', model: 'T-Rex 3', variant: '', category: 'Wearables' },
  { brand: 'Amazfit', model: 'Band 7', variant: '', category: 'Wearables' },
  { brand: 'Google', model: 'Pixel Watch', variant: '', category: 'Wearables' },
  { brand: 'Google', model: 'Fitbit Inspire 3', variant: '', category: 'Wearables' },
  { brand: 'Google', model: 'Fitbit Charge 6', variant: '', category: 'Wearables' },
  { brand: 'Google', model: 'Fitbit Versa 4', variant: '', category: 'Wearables' },
  { brand: 'Google', model: 'Fitbit Sense 2', variant: '', category: 'Wearables' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function productName(p) {
  return [p.brand, p.model, p.variant, p.size].filter(Boolean).join(' ')
}

function specsToRows(specsArr, extraColumns) {
  const map = {}
  for (const s of specsArr) {
    map[`${s.category}__${s.spec_name}`] = s
  }
  return map
}

// Score a product by counting verified true booleans + non-null text specs
function scoreProduct(productId, specsMap) {
  let score = 0
  for (const [key, spec] of Object.entries(specsMap)) {
    if (spec.product_id !== productId) continue
    if (spec.verified) {
      if (spec.spec_value === 'true') score += 1
      else if (spec.spec_value && spec.spec_value !== 'false' && spec.spec_value !== 'null') score += 0.5
    }
  }
  return score
}

// ─── API calls ───────────────────────────────────────────────────────────────
async function apiFetchSpecs(product) {
  const res = await fetch('/api/fetch-specs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: productName(product),
      brand: product.brand,
      model: product.model,
      variant: product.variant,
      size: product.size,
    }),
  })
  if (!res.ok) throw new Error(`fetch-specs failed: ${res.status}`)
  return res.json()
}

async function apiBatchCheck(products, specName, specType) {
  const res = await fetch('/api/batch-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products, specName, specType }),
  })
  if (!res.ok) throw new Error(`batch-check failed: ${res.status}`)
  return res.json()
}

// ─── Supabase writes ─────────────────────────────────────────────────────────
async function saveSpecsForProduct(productId, category, specsData) {
  // specsData is an object { "Spec Name": value, ... }
  const rows = []
  for (const [specName, value] of Object.entries(specsData)) {
    if (value === undefined) continue
    rows.push({
      product_id: productId,
      category,
      spec_name: specName,
      spec_value: value === null ? null : String(value),
      verified: value !== null,
    })
  }
  if (!rows.length) return

  await supabase
    .from('specs')
    .upsert(rows, { onConflict: 'product_id,category,spec_name', ignoreDuplicates: false })
}

async function processAndSaveSpecs(productId, specsPayload) {
  const categoryKeyMap = {
    display: 'display',
    durability: 'durability',
    gps: 'gps',
    battery: 'battery',
    health: 'health',
    sports: 'sports',
    connectivity: 'connectivity',
  }

  for (const [key, label] of Object.entries(categoryKeyMap)) {
    if (specsPayload[key]) {
      await saveSpecsForProduct(productId, key, specsPayload[key])
    }
  }

  // Handle extra_features — discover new spec columns
  if (specsPayload.extra_features?.length) {
    for (const feat of specsPayload.extra_features) {
      if (!feat.name || BUILT_IN_SPEC_NAMES.has(feat.name)) continue

      // Upsert into spec_columns
      const { data: existing } = await supabase
        .from('spec_columns')
        .select('id')
        .eq('spec_name', feat.name)
        .maybeSingle()

      if (!existing) {
        await supabase.from('spec_columns').insert({
          category: 'extra',
          spec_name: feat.name,
          spec_type: feat.type ?? 'boolean',
        })
      }

      // Save this product's value
      await saveSpecsForProduct(productId, 'extra', { [feat.name]: feat.value })
    }
  }
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('select') // 'select' | 'compare' | 'add'
  const [products, setProducts] = useState([])
  const [specs, setSpecs] = useState([]) // flat array from DB
  const [specColumns, setSpecColumns] = useState([]) // extra discovered columns
  const [selected, setSelected] = useState([]) // product ids
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Wearables')
  const [collapsedSections, setCollapsedSections] = useState({})
  const [fetchingIds, setFetchingIds] = useState(new Set())
  const [initProgress, setInitProgress] = useState(null) // null | { current, total, label }
  const [addForm, setAddForm] = useState({ category: 'Wearables', brand: '', model: '', variant: '', size: '', colors: '' })
  const [addError, setAddError] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const initRef = useRef(false)

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    const [{ data: prods }, { data: sp }, { data: cols }] = await Promise.all([
      supabase.from('products').select('*').order('brand').order('model'),
      supabase.from('specs').select('*'),
      supabase.from('spec_columns').select('*'),
    ])
    setProducts(prods ?? [])
    setSpecs(sp ?? [])
    setSpecColumns(cols ?? [])
  }, [])

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    loadAll()

    const ch = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'specs' }, () => {
        supabase.from('specs').select('*').then(({ data }) => setSpecs(data ?? []))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        supabase.from('products').select('*').order('brand').order('model').then(({ data }) => setProducts(data ?? []))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spec_columns' }, () => {
        supabase.from('spec_columns').select('*').then(({ data }) => setSpecColumns(data ?? []))
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [loadAll])

  // ── First-launch initialization ────────────────────────────────────────────
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function initialize() {
      const { data: state } = await supabase
        .from('app_state')
        .select('value')
        .eq('key', 'catalog_initialized')
        .maybeSingle()

      if (state?.value === 'true') return

      // Insert all catalog products
      const toInsert = INITIAL_CATALOG.map(p => ({
        name: [p.brand, p.model, p.variant].filter(Boolean).join(' '),
        brand: p.brand,
        model: p.model,
        variant: p.variant || null,
        size: null,
        colors: null,
        category: p.category,
      }))

      const { data: inserted, error: insertErr } = await supabase
        .from('products')
        .upsert(toInsert, { onConflict: 'name', ignoreDuplicates: true })
        .select()

      if (insertErr) {
        console.error('catalog insert error:', insertErr)
        return
      }

      // Re-fetch all products to get ids
      const { data: allProds } = await supabase.from('products').select('*')
      const prodsWithNoSpecs = (allProds ?? []).filter(p => {
        return !(specs.some(s => s.product_id === p.id))
      })

      if (!prodsWithNoSpecs.length) {
        await supabase.from('app_state').upsert({ key: 'catalog_initialized', value: 'true' })
        return
      }

      setInitProgress({ current: 0, total: prodsWithNoSpecs.length, label: '' })

      for (let i = 0; i < prodsWithNoSpecs.length; i++) {
        const prod = prodsWithNoSpecs[i]
        setInitProgress({ current: i + 1, total: prodsWithNoSpecs.length, label: productName(prod) })
        try {
          const { specs: fetched } = await apiFetchSpecs(prod)
          await processAndSaveSpecs(prod.id, fetched)
        } catch (err) {
          console.warn(`Failed to fetch specs for ${productName(prod)}:`, err)
        }
      }

      await supabase.from('app_state').upsert({ key: 'catalog_initialized', value: 'true' })
      setInitProgress(null)
    }

    initialize()
  }, []) // intentionally empty — run once on mount

  // ── Manual refresh ─────────────────────────────────────────────────────────
  async function refreshProduct(product) {
    if (fetchingIds.has(product.id)) return
    setFetchingIds(prev => new Set([...prev, product.id]))
    try {
      const { specs: fetched } = await apiFetchSpecs(product)
      await processAndSaveSpecs(product.id, fetched)
    } catch (err) {
      console.error('refresh error:', err)
    } finally {
      setFetchingIds(prev => { const s = new Set(prev); s.delete(product.id); return s })
    }
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  function toggleSelect(id) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= MAX_COMPARE) return prev
      return [...prev, id]
    })
  }

  // ── Spec lookup helpers ────────────────────────────────────────────────────
  function getSpec(productId, category, specName) {
    return specs.find(s => s.product_id === productId && s.category === category && s.spec_name === specName)
  }

  function getSpecValue(productId, category, specName) {
    const s = getSpec(productId, category, specName)
    if (!s) return undefined // unknown
    if (!s.verified || s.spec_value === null) return null
    return s.spec_value
  }

  // ── Add product form ───────────────────────────────────────────────────────
  async function handleAddProduct(e) {
    e.preventDefault()
    setAddError('')
    if (!addForm.brand.trim() || !addForm.model.trim()) {
      setAddError('Brand and Model are required.')
      return
    }
    setAddSaving(true)
    try {
      const name = [addForm.brand, addForm.model, addForm.variant].filter(Boolean).join(' ')
      const { data: prod, error } = await supabase
        .from('products')
        .insert({
          name,
          brand: addForm.brand.trim(),
          model: addForm.model.trim(),
          variant: addForm.variant.trim() || null,
          size: addForm.size.trim() || null,
          colors: addForm.colors.trim() || null,
          category: addForm.category,
        })
        .select()
        .single()

      if (error) throw error

      setAddForm({ category: 'Wearables', brand: '', model: '', variant: '', size: '', colors: '' })
      setView('select')

      // Trigger spec fetch in background
      apiFetchSpecs(prod)
        .then(({ specs: fetched }) => processAndSaveSpecs(prod.id, fetched))
        .catch(console.error)
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddSaving(false)
    }
  }

  // ── Filtered product list ──────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchCat = !categoryFilter || p.category === categoryFilter
    const q = search.toLowerCase()
    const matchSearch = !q || productName(p).toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const brands = [...new Set(filteredProducts.map(p => p.brand))].sort()

  // ── Compare data ───────────────────────────────────────────────────────────
  const selectedProducts = products.filter(p => selected.includes(p.id))

  const benchmarkId = selectedProducts.length
    ? selectedProducts.reduce((best, p) => {
        return scoreProduct(p.id, Object.fromEntries(specs.filter(s => s.product_id === p.id).map(s => [s.id, s]))) >
          scoreProduct(best.id, Object.fromEntries(specs.filter(s => s.product_id === best.id).map(s => [s.id, s])))
          ? p
          : best
      }, selectedProducts[0]).id
    : null

  // Collect extra spec columns used by any selected product
  const extraSpecsInView = specColumns.filter(col => {
    return selectedProducts.some(p =>
      specs.some(s => s.product_id === p.id && s.category === 'extra' && s.spec_name === col.spec_name),
    )
  })

  // ── Render helpers ─────────────────────────────────────────────────────────
  function SpecCell({ productId, category, specName, specType, isBenchmark, benchId }) {
    const val = getSpecValue(productId, category, specName)
    const isFetching = fetchingIds.has(productId)

    if (val === undefined) {
      // No record at all
      return (
        <td className="px-3 py-2 text-center text-sm">
          {isFetching ? <span className="text-gray-400 animate-pulse">…</span> : <span className="text-gray-400">?</span>}
        </td>
      )
    }

    if (val === null) {
      return (
        <td className="px-3 py-2 text-center text-sm">
          <span className="text-gray-400">?</span>
        </td>
      )
    }

    const isMissing = !isBenchmark && specType === 'boolean' && val === 'false'

    if (specType === 'boolean') {
      const hasProp = val === 'true'
      return (
        <td className={`px-3 py-2 text-center text-sm ${isMissing ? 'opacity-40' : ''}`}>
          {hasProp
            ? <span className="text-green-600 font-bold text-base">✓</span>
            : <span className="text-red-500 font-bold text-base">✗</span>}
        </td>
      )
    }

    return (
      <td className={`px-3 py-2 text-center text-xs ${isMissing ? 'opacity-40' : ''}`}>
        {val}
      </td>
    )
  }

  // ── Views ──────────────────────────────────────────────────────────────────
  function InitScreen() {
    if (!initProgress) return null
    const pct = Math.round((initProgress.current / initProgress.total) * 100)
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-gray-950 p-8">
        <div className="w-16 h-16 mb-6 flex items-center justify-center rounded-2xl" style={{ background: BB_BLUE }}>
          <span className="text-white text-2xl font-bold">BB</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Setting up catalog…</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
          Fetching specs for {initProgress.total} products. This happens once.
        </p>
        <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-800 rounded-full h-3 mb-2">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: BB_BLUE }}
          />
        </div>
        <p className="text-xs text-gray-400 mb-1">{pct}% — {initProgress.current} of {initProgress.total}</p>
        <p className="text-xs text-gray-400 truncate max-w-xs">{initProgress.label}</p>
      </div>
    )
  }

  function SelectView() {
    return (
      <div className="flex flex-col h-full">
        {/* Search */}
        <div className="px-4 pt-4 pb-2">
          <input
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 dark:text-white"
            style={{ '--tw-ring-color': BB_BLUE }}
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {['Wearables', 'Health & Wellness', 'Smarthome'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
              style={categoryFilter === cat ? { background: BB_BLUE } : {}}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Selected count bar */}
        {selected.length > 0 && (
          <div className="mx-4 mb-3 rounded-xl px-4 py-2.5 flex items-center justify-between text-white text-sm font-medium" style={{ background: BB_BLUE }}>
            <span>{selected.length} selected{selected.length < 2 ? ' — pick 1 more to compare' : ''}</span>
            <button onClick={() => setSelected([])} className="text-white/70 text-xs ml-2">Clear</button>
          </div>
        )}

        {/* Product list by brand */}
        <div className="flex-1 overflow-y-auto px-4 pb-32">
          {brands.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-8">No products match</p>
          )}
          {brands.map(brand => (
            <div key={brand} className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{brand}</h3>
              <div className="flex flex-col gap-2">
                {filteredProducts.filter(p => p.brand === brand).map(product => {
                  const isSelected = selected.includes(product.id)
                  const isFetching = fetchingIds.has(product.id)
                  const hasSpecs = specs.some(s => s.product_id === product.id && s.verified)
                  return (
                    <button
                      key={product.id}
                      onClick={() => toggleSelect(product.id)}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-all text-left ${
                        isSelected
                          ? 'border-transparent text-white'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                      }`}
                      style={isSelected ? { background: BB_BLUE, borderColor: BB_BLUE } : {}}
                    >
                      <div>
                        <p className="text-sm font-medium">{product.model}{product.variant ? ` — ${product.variant}` : ''}</p>
                        {product.size && <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>{product.size}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {isFetching && (
                          <span className={`text-xs animate-pulse ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>syncing…</span>
                        )}
                        {!hasSpecs && !isFetching && (
                          <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>?</span>
                        )}
                        {isSelected && <span className="text-white text-lg leading-none">✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function CompareView() {
    // Order: benchmark first, then rest
    const ordered = [
      ...selectedProducts.filter(p => p.id === benchmarkId),
      ...selectedProducts.filter(p => p.id !== benchmarkId),
    ]

    // Build all spec rows: built-in + extra
    const allCategories = [
      ...SPEC_CATEGORIES,
      ...(extraSpecsInView.length
        ? [{
            key: 'extra',
            label: 'Extra Features',
            specs: extraSpecsInView.map(c => ({ name: c.spec_name, type: c.spec_type })),
          }]
        : []),
    ]

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setView('select')}
            className="text-sm font-medium"
            style={{ color: BB_BLUE }}
          >
            ← Back
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1 text-center">
            Compare ({ordered.length})
          </span>
          <div className="w-12" />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto spec-table-scroll">
          <table className="min-w-max w-full border-collapse text-sm">
            {/* Product headers */}
            <thead>
              <tr>
                <th className="freeze-col bg-white dark:bg-gray-950 px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 w-36">
                  Spec
                </th>
                {ordered.map(p => (
                  <th
                    key={p.id}
                    className="px-3 py-3 text-center text-xs font-semibold border-b border-gray-200 dark:border-gray-700 min-w-[120px]"
                    style={p.id === benchmarkId ? { color: BB_BLUE } : { color: 'var(--tw-color-gray-700, #374151)' }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {p.id === benchmarkId && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white" style={{ background: BB_BLUE }}>
                          Best
                        </span>
                      )}
                      <span className="dark:text-white text-gray-800">{p.brand}</span>
                      <span className="font-normal text-[11px] text-gray-500 dark:text-gray-400">
                        {p.model}{p.variant ? ` ${p.variant}` : ''}
                      </span>
                      <button
                        onClick={() => refreshProduct(p)}
                        className="text-[10px] text-gray-400 hover:text-gray-600 mt-0.5"
                        title="Refresh specs"
                      >
                        {fetchingIds.has(p.id) ? '⟳ syncing…' : '↻ refresh'}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {allCategories.map(cat => {
                const isCollapsed = collapsedSections[cat.key]
                return (
                  <>
                    {/* Category header row */}
                    <tr key={`cat-${cat.key}`}>
                      <td
                        colSpan={ordered.length + 1}
                        className="freeze-col bg-gray-50 dark:bg-gray-900 px-3 py-2 cursor-pointer select-none"
                        onClick={() =>
                          setCollapsedSections(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))
                        }
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          {isCollapsed ? '▶' : '▼'} {cat.label}
                        </span>
                      </td>
                    </tr>

                    {/* Spec rows */}
                    {!isCollapsed &&
                      cat.specs.map(spec => (
                        <tr
                          key={`${cat.key}-${spec.name}`}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                        >
                          <td className="freeze-col bg-white dark:bg-gray-950 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 font-medium w-36 max-w-[144px]">
                            {spec.name}
                          </td>
                          {ordered.map(p => (
                            <SpecCell
                              key={p.id}
                              productId={p.id}
                              category={cat.key}
                              specName={spec.name}
                              specType={spec.type}
                              isBenchmark={p.id === benchmarkId}
                              benchId={benchmarkId}
                            />
                          ))}
                        </tr>
                      ))}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function AddView() {
    const existingBrands = [...new Set(products.map(p => p.brand))].sort()
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setView('select')} className="text-sm font-medium" style={{ color: BB_BLUE }}>
            ← Cancel
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1 text-center">Add Product</span>
          <div className="w-16" />
        </div>

        <form onSubmit={handleAddProduct} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 pb-32">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Category</label>
            <select
              value={addForm.category}
              onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none"
            >
              <option>Wearables</option>
              <option>Health &amp; Wellness</option>
              <option>Smarthome</option>
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Brand</label>
            <input
              list="brand-options"
              value={addForm.brand}
              onChange={e => setAddForm(f => ({ ...f, brand: e.target.value }))}
              placeholder="e.g. Garmin"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none"
              required
            />
            <datalist id="brand-options">
              {existingBrands.map(b => <option key={b} value={b} />)}
            </datalist>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Model</label>
            <input
              value={addForm.model}
              onChange={e => setAddForm(f => ({ ...f, model: e.target.value }))}
              placeholder="e.g. Fenix 9"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none"
              required
            />
          </div>

          {/* Variant */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Variant <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              value={addForm.variant}
              onChange={e => setAddForm(f => ({ ...f, variant: e.target.value }))}
              placeholder="e.g. Solar, Titanium"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Size */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Size <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              value={addForm.size}
              onChange={e => setAddForm(f => ({ ...f, size: e.target.value }))}
              placeholder="e.g. 47mm"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Colors */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Colors <span className="font-normal text-gray-400">(optional, comma-separated)</span></label>
            <input
              value={addForm.colors}
              onChange={e => setAddForm(f => ({ ...f, colors: e.target.value }))}
              placeholder="e.g. Black, Silver, Rose Gold"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none"
            />
          </div>

          {addError && <p className="text-sm text-red-500">{addError}</p>}

          <button
            type="submit"
            disabled={addSaving}
            className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: BB_BLUE }}
          >
            {addSaving ? 'Saving & fetching specs…' : 'Add Product'}
          </button>
        </form>
      </div>
    )
  }

  // ── Root render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-dvh max-w-lg mx-auto bg-white dark:bg-gray-950 relative">
      {InitScreen()}

      {/* Top bar */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: BB_BLUE }}>
            BB
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">VPL Tool</span>
        </div>
        {view === 'select' && (
          <button
            onClick={() => setView('add')}
            className="text-sm font-medium"
            style={{ color: BB_BLUE }}
          >
            + Add
          </button>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative">
        {view === 'select' && SelectView()}
        {view === 'compare' && CompareView()}
        {view === 'add' && AddView()}
      </main>

      {/* Compare CTA (floats above bottom bar) */}
      {view === 'select' && selected.length >= 2 && (
        <div className="absolute bottom-16 left-0 right-0 px-4 pb-2 z-20 max-w-lg mx-auto">
          <button
            onClick={() => setView('compare')}
            className="w-full rounded-2xl py-4 text-white font-bold text-base shadow-xl active:scale-95 transition-transform"
            style={{ background: BB_BLUE }}
          >
            Compare {selected.length} Products →
          </button>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="shrink-0 flex border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 safe-area-pb">
        <button
          className="flex-1 flex flex-col items-center py-2 gap-0.5"
          onClick={() => { setView('select'); setSelected([]) }}
        >
          <span className="text-lg" style={{ color: view !== 'add' ? BB_BLUE : '#9ca3af' }}>⊞</span>
          <span className="text-[10px] font-semibold" style={{ color: view !== 'add' ? BB_BLUE : '#9ca3af' }}>Compare</span>
        </button>
        <button className="flex-1 flex flex-col items-center py-2 gap-0.5 opacity-40" disabled>
          <span className="text-lg text-gray-400">◎</span>
          <span className="text-[10px] font-semibold text-gray-400">Tracker</span>
        </button>
      </nav>
    </div>
  )
}
