'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  fmt,
  fmtSlope,
  calcHI,
  calcHubElev,
  calcStartInvert,
  calcInvert,
  calcStructure,
  getSlopeWarning,
  calcSlopeSigned,
  calcEndInvertFromSlope,
  calcStartInvertFromSlope,
} from '@/utils/formulas'
import type { RunV2Payload, StructureCalcState } from '../../utils/types'

// --- Field rounding helpers (hundredths)
const round2 = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100

const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

const makeStructure = (n: number): StructureCalcState => ({
  id: uid(),
  name: `CB-${n}`,
  endName: `CB-${n + 1}`,
  flowMode: 'positive',

  bmElev: null,
  rodBM: null,
  hi: null,
  hiLocked: false,

  rodHub: null,
  cfMode: 'cut',
  cfValue: null,
  hubElev: null,
  startInvert: null,
  startLocked: false,

  slope: {
    rodA: null,
    rodB: null,
    distance: null,
    invA: null,
    invB: null,
    solveMode: 'slope',
    manualSlope: null,
  },

  struct: {
    enabled: false,
    invert: null,
    pipeWall: 0.17,
    basinFloor: 0.50,
    stoneDepth: 0.33,
    boxHeight: 4.00,
  },
})

export default function CalculatorPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // V2 — structures inside a run
  const [initial] = useState(() => makeStructure(1))
  const [structures, setStructures] = useState<StructureCalcState[]>(() => [initial])
  const [activeId, setActiveId] = useState<string>(() => initial.id)

  // --- Pipe shooting mode (invert vs bottom of pipe)
  const [shootTo, setShootTo] = useState<'invert' | 'pipeBottom'>('invert')
  const [pipeWallFt, setPipeWallFt] = useState<number>(0)

  const active = useMemo(
    () => structures.find(s => s.id === activeId) ?? structures[0],
    [structures, activeId]
  )

  // Auth check
  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/')
      else setUser(session.user)
      setLoading(false)
    })()
  }, [router])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const patchActive = (patch: Partial<StructureCalcState>) => {
    setStructures(prev => prev.map(s => s.id === activeId ? { ...s, ...patch } : s))
  }

  const patchSlope = (patch: Partial<StructureCalcState['slope']>) => {
    setStructures(prev => prev.map(s => s.id === activeId ? { ...s, slope: { ...s.slope, ...patch } } : s))
  }

  const patchStruct = (patch: Partial<StructureCalcState['struct']>) => {
    setStructures(prev => prev.map(s => s.id === activeId ? { ...s, struct: { ...s.struct, ...patch } } : s))
  }

  // Derived calculations for active structure (respecting locks)
  useEffect(() => {
    if (!active) return

    // Section 1 — HI
    if (!active.hiLocked && active.bmElev != null && active.rodBM != null) {
      patchActive({ hi: calcHI(active.bmElev, active.rodBM) })
    }
    if (!active.hiLocked && (active.bmElev == null || active.rodBM == null)) {
      patchActive({ hi: null })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active?.bmElev, active?.rodBM, active?.hiLocked])

  useEffect(() => {
    if (!active) return

    // Section 2 — Hub/Start invert
    if (active.hi != null && active.rodHub != null) {
      const hub = calcHubElev(active.hi, active.rodHub)
      patchActive({ hubElev: hub })
      if (!active.startLocked && active.cfValue != null && active.cfValue >= 0) {
        patchActive({ startInvert: calcStartInvert(hub, active.cfValue, active.cfMode) })
      }
    } else {
      patchActive({ hubElev: null })
      if (!active.startLocked) patchActive({ startInvert: null })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active?.hi, active?.rodHub, active?.cfValue, active?.cfMode, active?.startLocked])

  useEffect(() => {
    if (!active) return

    // Section 3 — slope shots (if solving slope)
    const { rodA, rodB, distance, solveMode } = active.slope
    if (solveMode === 'slope') {
      if (active.hi != null && rodA != null && rodB != null && distance != null && distance > 0) {
        const rawIA = calcInvert(active.hi, rodA)
        const rawIB = calcInvert(active.hi, rodB)

        // Apply pipe shooting mode
        const iA = shootTo === 'invert' ? rawIA : (rawIA - pipeWallFt)
        const iB = shootTo === 'invert' ? rawIB : (rawIB - pipeWallFt)

        patchSlope({
          invA: round2(iA),
          invB: round2(iB),
        })
      } else {
        patchSlope({ invA: null, invB: null })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeId,
    active?.hi,
    active?.slope.rodA,
    active?.slope.rodB,
    active?.slope.distance,
    active?.slope.solveMode,
    shootTo,
    pipeWallFt,
  ])

  // Helper: label + elevation adjustments for display/solve
  const gradeRefLabel = shootTo === 'invert' ? 'Invert (Flow Line)' : 'Bottom of Pipe'

  const startElevForGrade = useMemo(() => {
    if (!active) return null
    if (active.startInvert == null) return null
    return round2(shootTo === 'invert' ? active.startInvert : (active.startInvert - pipeWallFt))
  }, [active, shootTo, pipeWallFt])

  const slopePercent = useMemo(() => {
    if (!active) return null
    const { solveMode, invA, invB, distance, manualSlope } = active.slope
    if (distance == null || distance <= 0) return null

    if (solveMode === 'slope') {
      if (invA == null || invB == null) return null
      return round2(calcSlopeSigned(invA, invB, distance, active.flowMode))
    }

    if (manualSlope == null) return null
    const signed = active.flowMode === 'positive' ? manualSlope : -manualSlope
    return round2(signed)
  }, [active])

  const solvedInverts = useMemo(() => {
    if (!active) return { invA: null as number | null, invB: null as number | null }

    const { solveMode, distance, manualSlope } = active.slope
    const d = distance ?? null
    if (!d || d <= 0) return { invA: active.slope.invA, invB: active.slope.invB }

    // Always treat "Start" in grade solve as the structure start invert adjusted for shoot mode
    const baseStart = startElevForGrade

    if (solveMode === 'endInvert') {
      const s = manualSlope
      if (baseStart == null || s == null) return { invA: baseStart, invB: null }
      const end = calcEndInvertFromSlope(baseStart, d, Math.abs(s), active.flowMode)
      return { invA: baseStart, invB: round2(end) }
    }

    if (solveMode === 'startInvert') {
      const s = manualSlope
      const end = active.slope.invB
      if (end == null || s == null) return { invA: null, invB: end }
      const start = calcStartInvertFromSlope(end, d, Math.abs(s), active.flowMode)
      return { invA: round2(start), invB: end }
    }

    return { invA: active.slope.invA, invB: active.slope.invB }
  }, [active, startElevForGrade])

  const slopeWarn = useMemo(() => {
    const s = slopePercent
    if (s == null) return null
    return getSlopeWarning(Math.abs(s))
  }, [slopePercent])

  const structCalc = useMemo(() => {
    if (!active?.struct.enabled) return null
    if (active.struct.invert == null) return null
    return calcStructure(
      active.struct.invert,
      active.struct.pipeWall,
      active.struct.basinFloor,
      active.struct.stoneDepth,
      active.struct.boxHeight,
      active.hi ?? 0
    )
  }, [active])

  const addStructure = () => {
    const next = makeStructure(structures.length + 1)
    setStructures(prev => [...prev, next])
    setActiveId(next.id)
  }

  const deleteActive = () => {
    if (structures.length <= 1) return

    const ok = confirm(`Delete ${active?.name}?`)
    if (!ok) return

    setStructures(prev => {
      const idx = prev.findIndex(s => s.id === activeId)
      const next = prev.filter(s => s.id !== activeId)
      const newActive =
        next[Math.max(0, idx - 1)]?.id ?? next[0]?.id

      setActiveId(newActive)
      return next
    })
  }

  const lockToggleHI = () => patchActive({ hiLocked: !active.hiLocked })
  const lockToggleStart = () => patchActive({ startLocked: !active.startLocked })

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleSaveRun = async () => {
    if (!user) return
    const name = prompt('Name this run:', 'Run ' + new Date().toLocaleDateString())
    if (!name) return

    const payload: RunV2Payload = {
      version: 2,
      structures,
      activeStructureId: activeId,
    }

    // Save a “summary” from the active structure for quick list views
    const summary = active ?? structures[0]

    const { error } = await supabase.from('runs').insert({
      user_id: user.id,
      name,
      bm_elev: summary?.bmElev ?? null,
      hi: summary?.hi ?? null,
      start_invert: summary?.startInvert ?? null,
      slope_percent: slopePercent ?? null,
      payload,
    } as any)

    if (error) {
      alert(
        'Save failed: ' + error.message + '\n\n' +
        'If this mentions an unknown column like "payload", run this SQL in Supabase:\n' +
        'ALTER TABLE runs ADD COLUMN IF NOT EXISTS payload jsonb;'
      )
    } else {
      showToast('Saved: ' + name)
    }
  }

  const setSolveMode = (mode: 'slope' | 'endInvert' | 'startInvert') => {
    patchSlope({ solveMode: mode })
    // Clear irrelevant fields
    if (mode === 'slope') patchSlope({ manualSlope: null })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-text3">Loading...</p>
      </div>
    )
  }

  if (!active) return null

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface border-b-2 border-accent px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-accent uppercase tracking-wide">Grade Calc</h1>
          <p className="font-mono text-[9px] text-text3 uppercase tracking-widest">{user?.email}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push('/runs')}
            className="px-3 py-1.5 border border-border rounded text-xs font-mono text-text2 hover:border-accent hover:text-accent uppercase tracking-wide transition-colors"
          >
            📋 Runs
          </button>
          <button
            onClick={handleSaveRun}
            className="px-3 py-1.5 border border-border rounded text-xs font-mono text-text2 hover:border-accent-green hover:text-accent-green uppercase tracking-wide transition-colors"
          >
            💾 Save
          </button>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 border border-border rounded text-xs font-mono text-text2 hover:border-accent-red hover:text-accent-red uppercase tracking-wide transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-accent-green text-black px-6 py-2 rounded-md font-display font-bold text-sm uppercase tracking-wide">
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Structure list */}
        <aside className="bg-surface2 border border-border rounded-lg p-4 h-fit lg:sticky lg:top-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-bold text-accent uppercase tracking-wide">Structures</h2>
            <button
              onClick={addStructure}
              className="px-2 py-1 border border-border rounded text-xs font-mono text-text2 hover:border-accent hover:text-accent uppercase tracking-wide transition-colors"
            >
              + Add
            </button>
          </div>

          <div className="space-y-2">
            {structures.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={
                  'w-full text-left px-3 py-2 rounded border transition-colors ' +
                  (s.id === activeId
                    ? 'border-accent bg-surface'
                    : 'border-border bg-surface2 hover:border-accent/60')
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display font-bold text-sm text-text">{s.name}</div>
                    <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">
                      → {s.endName} · {s.flowMode === 'positive' ? 'Positive flow' : 'Negative flow'}
                    </div>
                  </div>
                  <div className="font-mono text-[10px] text-text3">#{idx + 1}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <div>
              <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Start Box</label>
              <input
                value={active.name}
                onChange={(e) => patchActive({ name: e.target.value })}
                className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">End Box</label>
              <input
                value={active.endName}
                onChange={(e) => patchActive({ endName: e.target.value })}
                className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Flow Direction</label>
                <select
                  value={active.flowMode}
                  onChange={(e) => patchActive({ flowMode: e.target.value as any })}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono"
                >
                  <option value="positive">Downhill</option>
                  <option value="negative">Uphill</option>
                </select>
              </div>
              <button
                onClick={deleteActive}
                disabled={structures.length <= 1}
                className="mt-5 px-3 py-2 border border-border rounded text-xs font-mono text-text2 hover:border-accent-red hover:text-accent-red disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text2 uppercase tracking-wide transition-colors"
              >
                Delete
              </button>
            </div>

            <p className="font-mono text-[10px] text-text3 leading-relaxed">
              Tip: When the rod moves, unlock HI, enter new BM/rod, then lock again. Locked inverts stay the same.
            </p>
          </div>
        </aside>

        {/* Main calculator */}
        <main className="space-y-4">
          {/* Section 1: HI */}
          <section className="bg-surface2 border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-accent uppercase tracking-wide">01 · Height of Instrument</h2>
              <button
                onClick={lockToggleHI}
                className={
                  'px-3 py-1.5 border rounded text-xs font-mono uppercase tracking-wide transition-colors ' +
                  (active.hiLocked ? 'border-accent-green text-accent-green' : 'border-border text-text2 hover:border-accent hover:text-accent')
                }
              >
                {active.hiLocked ? '🔒 Locked' : 'Lock'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Benchmark Elev (ft)</label>
                <input
                  type="number"
                  step="0.01"
                  value={active.bmElev ?? ''}
                  onChange={(e) => patchActive({ bmElev: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full bg-surface border-2 border-border rounded px-3 py-2 text-text font-mono font-bold text-xl focus:border-accent focus:outline-none disabled:opacity-50"
                  placeholder="0.00"
                  disabled={active.hiLocked}
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Rod on Benchmark (ft)</label>
                <input
                  type="number"
                  step="0.01"
                  value={active.rodBM ?? ''}
                  onChange={(e) => patchActive({ rodBM: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full bg-surface border-2 border-border rounded px-3 py-2 text-text font-mono font-bold text-xl focus:border-accent focus:outline-none disabled:opacity-50"
                  placeholder="0.00"
                  disabled={active.hiLocked}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between bg-surface border border-border rounded p-3">
              <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">HI</div>
              <div className="font-display text-2xl font-black text-text">{fmt(active.hi, 2)}</div>
            </div>
          </section>

          {/* Section 2: Hub → Start Invert */}
          <section className="bg-surface2 border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-accent uppercase tracking-wide">02 · Hub → Start Invert</h2>
              <button
                onClick={lockToggleStart}
                className={
                  'px-3 py-1.5 border rounded text-xs font-mono uppercase tracking-wide transition-colors ' +
                  (active.startLocked ? 'border-accent-green text-accent-green' : 'border-border text-text2 hover:border-accent hover:text-accent')
                }
              >
                {active.startLocked ? '🔒 Locked' : 'Lock'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Rod on Hub (ft)</label>
                <input
                  type="number"
                  step="0.01"
                  value={active.rodHub ?? ''}
                  onChange={(e) => patchActive({ rodHub: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono focus:border-accent focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Cut / Fill</label>
                <select
                  value={active.cfMode}
                  onChange={(e) => patchActive({ cfMode: e.target.value as any })}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono"
                >
                  <option value="cut">Cut</option>
                  <option value="fill">Fill</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">{active.cfMode === 'cut' ? 'Cut (ft)' : 'Fill (ft)'}</label>
                <input
                  type="number"
                  step="0.01"
                  value={active.cfValue ?? ''}
                  onChange={(e) => patchActive({ cfValue: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono focus:border-accent focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-surface border border-border rounded p-3">
                <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">Hub Elev</div>
                <div className="font-display text-xl font-black text-text">{fmt(active.hubElev, 2)}</div>
              </div>
              <div className="bg-surface border border-border rounded p-3">
                <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">Start Invert (Flow Line)</div>
                <div className="font-display text-xl font-black text-text">{fmt(active.startInvert, 2)}</div>
              </div>
            </div>
          </section>

          {/* Section 3: Grade */}
          <section className="bg-surface2 border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-accent uppercase tracking-wide">03 · Pipe Grade</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSolveMode('slope')}
                  className={'px-3 py-1.5 border rounded text-xs font-mono uppercase tracking-wide transition-colors ' +
                    (active.slope.solveMode === 'slope' ? 'border-accent text-accent' : 'border-border text-text2 hover:border-accent hover:text-accent')}
                >
                  Check Slope
                </button>
                <button
                  onClick={() => setSolveMode('endInvert')}
                  className={'px-3 py-1.5 border rounded text-xs font-mono uppercase tracking-wide transition-colors ' +
                    (active.slope.solveMode === 'endInvert' ? 'border-accent text-accent' : 'border-border text-text2 hover:border-accent hover:text-accent')}
                >
                  Find End
                </button>
                <button
                  onClick={() => setSolveMode('startInvert')}
                  className={'px-3 py-1.5 border rounded text-xs font-mono uppercase tracking-wide transition-colors ' +
                    (active.slope.solveMode === 'startInvert' ? 'border-accent text-accent' : 'border-border text-text2 hover:border-accent hover:text-accent')}
                >
                  Find Start
                </button>
              </div>
            </div>

            {/* Shoot to toggle */}
            <div className="mb-4 bg-surface border border-border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">Shoot To</div>
                <div className="font-display text-base font-black text-text">{gradeRefLabel}</div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShootTo('invert')}
                  className={
                    'px-3 py-2 border rounded text-xs font-mono uppercase tracking-wide transition-colors ' +
                    (shootTo === 'invert' ? 'border-accent text-accent' : 'border-border text-text2 hover:border-accent hover:text-accent')
                  }
                >
                  Invert
                </button>
                <button
                  type="button"
                  onClick={() => setShootTo('pipeBottom')}
                  className={
                    'px-3 py-2 border rounded text-xs font-mono uppercase tracking-wide transition-colors ' +
                    (shootTo === 'pipeBottom' ? 'border-accent text-accent' : 'border-border text-text2 hover:border-accent hover:text-accent')
                  }
                >
                  Bottom of Pipe
                </button>
              </div>

              {shootTo === 'pipeBottom' && (
                <div className="w-full md:w-56">
                  <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Pipe Wall Thickness (ft)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pipeWallFt ?? 0}
                    onChange={(e) => setPipeWallFt(e.target.value ? parseFloat(e.target.value) : 0)}
                    className="w-full bg-surface2 border border-border rounded px-3 py-2 text-text font-mono focus:border-accent focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Distance Between Boxes (ft)</label>
                <input
                  type="number"
                  step="0.01"
                  value={active.slope.distance ?? ''}
                  onChange={(e) => patchSlope({ distance: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono focus:border-accent focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              {active.slope.solveMode === 'slope' ? (
                <>
                  <div>
                    <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Rod @ Start Box (ft)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={active.slope.rodA ?? ''}
                      onChange={(e) => patchSlope({ rodA: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono focus:border-accent focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Rod @ End Box (ft)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={active.slope.rodB ?? ''}
                      onChange={(e) => patchSlope({ rodB: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono focus:border-accent focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Target Slope (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={active.slope.manualSlope ?? ''}
                      onChange={(e) => patchSlope({ manualSlope: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono focus:border-accent focus:outline-none"
                      placeholder="2.00"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">
                      End {gradeRefLabel} (ft)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={active.slope.invB ?? ''}
                      onChange={(e) => patchSlope({ invB: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono focus:border-accent focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-surface border border-border rounded p-3">
                <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">Start {gradeRefLabel} ({active.name})</div>
                <div className="font-display text-xl font-black text-text">
                  {fmt(solvedInverts.invA ?? startElevForGrade, 2)}
                </div>
              </div>
              <div className="bg-surface border border-border rounded p-3">
                <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">End {gradeRefLabel} ({active.endName})</div>
                <div className="font-display text-xl font-black text-text">{fmt(solvedInverts.invB, 2)}</div>
              </div>
              <div className="bg-surface border border-border rounded p-3">
                <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">Actual Slope (%)</div>
                <div className="font-display text-xl font-black text-text">{fmtSlope(slopePercent)}</div>
              </div>
            </div>

            {slopeWarn && (
              <div className="mt-3 text-xs font-mono text-text3 border border-border rounded p-3 bg-surface">
                {slopeWarn}
              </div>
            )}
          </section>

          {/* Section 4: Structure math */}
          <section className="bg-surface2 border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-accent uppercase tracking-wide">04 · Structure</h2>
              <label className="flex items-center gap-2 font-mono text-xs text-text2 uppercase tracking-wide">
                <input
                  type="checkbox"
                  checked={active.struct.enabled}
                  onChange={(e) => patchStruct({ enabled: e.target.checked })}
                />
                Enable
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Structure invert (flowline)</label>
                <input
                  type="number"
                  step="0.01"
                  value={active.struct.invert ?? ''}
                  onChange={(e) => patchStruct({ invert: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono focus:border-accent focus:outline-none disabled:opacity-50"
                  placeholder="0.00"
                  disabled={!active.struct.enabled}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Pipe wall (ft)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={active.struct.pipeWall}
                    onChange={(e) => patchStruct({ pipeWall: e.target.value ? parseFloat(e.target.value) : 0 })}
                    className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono disabled:opacity-50"
                    disabled={!active.struct.enabled}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-text3 uppercase tracking-wider mb-1">Box height (ft)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={active.struct.boxHeight}
                    onChange={(e) => patchStruct({ boxHeight: e.target.value ? parseFloat(e.target.value) : 0 })}
                    className="w-full bg-surface border border-border rounded px-3 py-2 text-text font-mono disabled:opacity-50"
                    disabled={!active.struct.enabled}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-surface border border-border rounded p-3">
                <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">Bottom of box</div>
                <div className="font-display text-lg font-black text-text">{fmt(structCalc?.bottomOfBox, 2)}</div>
              </div>
              <div className="bg-surface border border-border rounded p-3">
                <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">Stone bottom</div>
                <div className="font-display text-lg font-black text-text">{fmt(structCalc?.stoneBottom, 2)}</div>
              </div>
              <div className="bg-surface border border-border rounded p-3">
                <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">Rim elev</div>
                <div className="font-display text-lg font-black text-text">{fmt(structCalc?.rimElev, 2)}</div>
              </div>
              <div className="bg-surface border border-border rounded p-3">
                <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">Rod @ rim</div>
                <div className="font-display text-lg font-black text-text">{fmt(structCalc?.rodAtRim, 2)}</div>
              </div>
            </div>
          </section>

          {/* Footer quick actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-3 py-2 border border-border rounded text-xs font-mono text-text2 hover:border-accent hover:text-accent uppercase tracking-wide transition-colors"
            >
              ↑ Top
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
