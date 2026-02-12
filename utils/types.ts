export type StructureCalcState = {
  id: string
  name: string
  endName: string
  flowMode: 'positive' | 'negative'

  bmElev: number | null
  rodBM: number | null
  hi: number | null
  hiLocked: boolean

  rodHub: number | null
  cfMode: 'cut' | 'fill'
  cfValue: number | null
  hubElev: number | null
  startInvert: number | null
  startLocked: boolean

  slope: {
    rodA: number | null
    rodB: number | null
    distance: number | null
    invA: number | null
    invB: number | null
    solveMode: 'slope' | 'endInvert' | 'startInvert'
    manualSlope: number | null
  }

  struct: {
    enabled: boolean
    invert: number | null
    pipeWall: number
    basinFloor: number
    stoneDepth: number
    boxHeight: number
  }
}

export type RunV2Payload = {
  version: number
  structures: StructureCalcState[]
  activeStructureId: string
}
