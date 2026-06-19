// Global data types for Diamond Sim

export type Position =
  | 'C'
  | '1B'
  | '2B'
  | '3B'
  | 'SS'
  | 'LF'
  | 'CF'
  | 'RF'
  | 'DH'
  | 'SP'
  | 'RP'
  | 'CL'

export type PlayerType = 'hitter' | 'pitcher'

export interface HitterStats {
  G: number
  AB: number
  H: number
  HR: number
  RBI: number
  R: number
  BB: number
  SO: number
  SB: number
  AVG: string
  OBP: string
  SLG: string
  OPS: string
}

export interface PitcherStats {
  G: number
  GS: number
  W: number
  L: number
  SV: number
  IP: number
  H: number
  ER: number
  BB: number
  SO: number
  ERA: string
  WHIP: string
}

export interface Player {
  id: string
  firstName: string
  lastName: string
  position: Position
  type: PlayerType
  age: number
  overall: number

  // Hitter attributes (1–99 each, null for pitchers)
  contact: number | null
  power: number | null
  speed: number | null
  fielding: number | null
  arm: number | null
  discipline: number | null  // Strikeout avoidance / plate discipline
  vision: number | null      // Batting eye / on-base ability

  // Pitcher attributes (1–99 each, null for hitters)
  stuff: number | null
  control: number | null
  stamina: number | null
  accuracy: number | null    // Precision / walk reduction

  // Season stats (accumulated during simulation)
  stats: HitterStats | PitcherStats | null
}

export interface Team {
  id: string
  city: string
  nickname: string
  isUserTeam: boolean
  roster: Player[]
  wins: number
  losses: number
}

export interface GameResult {
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
}
