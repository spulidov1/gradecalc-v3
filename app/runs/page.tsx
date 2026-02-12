'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { RunV2Payload } from '@/utils/types'

interface RunRow {
  id: string
  name: string
  created_at: string
  updated_at?: string
  bm_elev: number | null
  hi: number | null
  start_invert: number | null
  slope_percent: number | null
  payload?: RunV2Payload | null
}

export default function RunsPage() {
  const router = useRouter()
  const [runs, setRuns] = useState<RunRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      setUserId(session.user.id)
      await loadRuns(session.user.id)
      setLoading(false)
    })()
  }, [router])

  const loadRuns = async (uid: string) => {
    const { data, error } = await supabase
      .from('runs')
      .select('*')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false })

    if (!error && data) setRuns(data as any)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this run?')) return
    const { error } = await supabase.from('runs').delete().eq('id', id)
    if (!error && userId) loadRuns(userId)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <p className="font-mono text-text3">Loading...</p>
    </div>
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="sticky top-0 z-50 bg-surface border-b-2 border-accent px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-accent uppercase tracking-wide">Runs</h1>
          <p className="font-mono text-[9px] text-text3 uppercase tracking-widest">Saved history</p>
        </div>
        <button
          onClick={() => router.push('/calculator')}
          className="px-3 py-1.5 border border-border rounded text-xs font-mono text-text2 hover:border-accent hover:text-accent uppercase tracking-wide transition-colors"
        >
          ← Back
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {runs.length === 0 && (
          <div className="bg-surface2 border border-border rounded-lg p-6">
            <p className="font-mono text-text3">No runs saved yet.</p>
          </div>
        )}

        {runs.map((run) => {
          const payload = run.payload
          const v2 = payload?.version === 2
          const structCount = v2 ? payload.structures.length : null
          const activeName = v2
            ? payload.structures.find(s => s.id === payload.activeStructureId)?.name
            : null

          return (
            <div key={run.id} className="bg-surface2 border border-border rounded-lg p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-black text-text">{run.name}</div>
                  <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">
                    {new Date(run.updated_at ?? run.created_at).toLocaleString()}
                    {v2 ? ` · ${structCount} structures · active: ${activeName ?? '—'}` : ' · v1 run'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(run.id)}
                    className="px-3 py-1.5 border border-border rounded text-xs font-mono text-text2 hover:border-accent-red hover:text-accent-red uppercase tracking-wide transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {v2 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {payload.structures.slice(0, 3).map((s) => (
                    <div key={s.id} className="bg-surface border border-border rounded p-3">
                      <div className="font-mono text-[10px] text-text3 uppercase tracking-widest">{s.name} → {s.endName}</div>
                      <div className="font-mono text-xs text-text2 mt-1">
                        HI {s.hiLocked ? '🔒' : ''}: {s.hi ?? '—'} · Start inv: {s.startInvert ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
