// ─────────────────────────────────────────────
// GRADE CALC — FROZEN FORMULAS
// ─────────────────────────────────────────────

export const fmt = (v: number | null | undefined, decimals = 2): string => {
  if (v == null || isNaN(v)) return '—'
  return v.toFixed(decimals)
}

export const fmtSlope = (v: number | null | undefined): string => {
  if (v == null || isNaN(v)) return '—'
  return v.toFixed(2) + '%'
}

// Section 1 — HI
export const calcHI = (bmElev: number, rodBM: number): number =>
  bmElev + rodBM

// Section 2 — Hub + Cut/Fill → Start Invert
export const calcHubElev = (hi: number, rodHub: number): number =>
  hi - rodHub

export const calcStartInvert = (
  hubElev: number,
  cfValue: number,
  cfMode: 'cut' | 'fill'
): number =>
  cfMode === 'cut' ? hubElev - cfValue : hubElev + cfValue

// Section 3 — Slope from two shots
export const calcInvert = (hi: number, rod: number): number => hi - rod

export const calcSlopePercent = (
  invA: number,
  invB: number,
  distance: number
): number => (Math.abs(invA - invB) / distance) * 100

export const getSlopeWarning = (slope: number): string | null => {
  if (slope < 0.01) return '⚠ Slope < 0.01% — essentially flat'
  if (slope > 15) return '⚠ Slope > 15% — check inputs'
  return null
}

// Section 4 — Structure
export interface StructureResults {
  bottomOfBox: number
  bed: number
  dig: number
  rim: number
  digRod: number
  bedRod: number
  rimRod: number
}

export const calcStructure = (
  invert: number,
  pipeWall: number,
  basinFloor: number,
  stoneDepth: number,
  boxHeight: number,
  hi: number
): StructureResults => {
  const bottomOfBox = invert - pipeWall - basinFloor
  const bed = bottomOfBox
  const dig = bottomOfBox - stoneDepth
  const rim = bottomOfBox + boxHeight
  return {
    bottomOfBox,
    bed,
    dig,
    rim,
    digRod: hi - dig,
    bedRod: hi - bed,
    rimRod: hi - rim,
  }
}


// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// V2 helpers — flow direction + solve modes
// ─────────────────────────────────────────────

export const calcSlopeSigned = (
  invA: number,
  invB: number,
  distance: number,
  flowMode: 'positive' | 'negative'
): number => {
  if (distance === 0) return 0
  // For field work, we often want “percent grade” to read positive regardless of
  // whether you’re thinking A→B or B→A. We define:
  // - positive: A→B is down-grade (invA > invB) => positive slope
  // - negative: A→B is up-grade (invB > invA) => positive slope
  const raw = ((invA - invB) / distance) * 100
  return flowMode === 'positive' ? raw : -raw
}

export const calcEndInvertFromSlope = (
  startInvert: number,
  distance: number,
  slopePercent: number,
  flowMode: 'positive' | 'negative'
): number => {
  // slopePercent is treated as a positive number “in the direction of flow”
  const signed = flowMode === 'positive' ? slopePercent : -slopePercent
  return startInvert - (signed / 100) * distance
}

export const calcStartInvertFromSlope = (
  endInvert: number,
  distance: number,
  slopePercent: number,
  flowMode: 'positive' | 'negative'
): number => {
  const signed = flowMode === 'positive' ? slopePercent : -slopePercent
  return endInvert + (signed / 100) * distance
}
