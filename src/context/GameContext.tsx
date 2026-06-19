import React, { createContext, useReducer, useCallback, useEffect } from 'react'
import { Team, Player, GameResult } from '../types'

const STORAGE_KEY = 'diamondSim_state'
const APP_VERSION = '1.0'

export interface GameContextState {
  teams: Team[]
  playerPool: Player[]
  availablePlayers: Player[]
  draftOrder: { pickNumber: number; round: number; teamId: string }[]
  currentPickIndex: number
  userTeamId: string
  userPickNumber: number
  schedule: GameResult[]
  seasonSimulated: boolean
}

export interface GameContextType extends GameContextState {
  initGame: (teams: Team[], playerPool: Player[], userTeamId: string, userPickNumber: number, draftOrder: any[]) => void
  draftPlayer: (playerId: string, teamId: string) => void
  advancePick: () => void
  simulateSeason: (schedule: GameResult[], updatedTeams: Team[]) => void
  resetGame: () => void
}

const initialState: GameContextState = {
  teams: [],
  playerPool: [],
  availablePlayers: [],
  draftOrder: [],
  currentPickIndex: 0,
  userTeamId: '',
  userPickNumber: 0,
  schedule: [],
  seasonSimulated: false,
}

type Action =
  | { type: 'INIT_GAME'; payload: { teams: Team[]; playerPool: Player[]; userTeamId: string; userPickNumber: number; draftOrder: any[] } }
  | { type: 'DRAFT_PLAYER'; payload: { playerId: string; teamId: string } }
  | { type: 'ADVANCE_PICK' }
  | { type: 'SIMULATE_SEASON'; payload: { schedule: GameResult[]; teams: Team[] } }
  | { type: 'RESET_GAME' }
  | { type: 'RESTORE_STATE'; payload: GameContextState }

function gameReducer(state: GameContextState, action: Action): GameContextState {
  switch (action.type) {
    case 'INIT_GAME': {
      const { teams, playerPool, userTeamId, userPickNumber, draftOrder } = action.payload
      return {
        ...state,
        teams,
        playerPool,
        availablePlayers: playerPool,
        userTeamId,
        userPickNumber,
        draftOrder,
        currentPickIndex: 0,
        seasonSimulated: false,
      }
    }
    case 'DRAFT_PLAYER': {
      const { playerId, teamId } = action.payload
      const player = state.availablePlayers.find((p) => p.id === playerId)
      if (!player) return state

      const updatedTeams = state.teams.map((team) => {
        if (team.id === teamId) {
          return {
            ...team,
            roster: [...team.roster, player],
          }
        }
        return team
      })

      const updatedAvailable = state.availablePlayers.filter((p) => p.id !== playerId)

      return {
        ...state,
        teams: updatedTeams,
        availablePlayers: updatedAvailable,
      }
    }
    case 'ADVANCE_PICK':
      return {
        ...state,
        currentPickIndex: state.currentPickIndex + 1,
      }
    case 'SIMULATE_SEASON':
      return {
        ...state,
        schedule: action.payload.schedule,
        teams: action.payload.teams,
        seasonSimulated: true,
      }
    case 'RESET_GAME':
      return initialState
    case 'RESTORE_STATE':
      return action.payload
    default:
      return state
  }
}

export const GameContext = createContext<GameContextType | undefined>(undefined)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      diamondSim_version: APP_VERSION,
      ...state,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
  }, [state])

  // Restore state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.diamondSim_version === APP_VERSION) {
          const { diamondSim_version, ...stateData } = parsed
          dispatch({ type: 'RESTORE_STATE', payload: stateData as GameContextState })
        } else {
          // Version mismatch, clear storage
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch (error) {
        console.error('Failed to restore game state:', error)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  const initGame = useCallback(
    (teams: Team[], playerPool: Player[], userTeamId: string, userPickNumber: number, draftOrder: any[]) => {
      dispatch({ type: 'INIT_GAME', payload: { teams, playerPool, userTeamId, userPickNumber, draftOrder } })
    },
    []
  )

  const draftPlayer = useCallback((playerId: string, teamId: string) => {
    dispatch({ type: 'DRAFT_PLAYER', payload: { playerId, teamId } })
  }, [])

  const advancePick = useCallback(() => {
    dispatch({ type: 'ADVANCE_PICK' })
  }, [])

  const simulateSeason = useCallback((schedule: GameResult[], updatedTeams: Team[]) => {
    dispatch({ type: 'SIMULATE_SEASON', payload: { schedule, teams: updatedTeams } })
  }, [])

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' })
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value: GameContextType = {
    ...state,
    initGame,
    draftPlayer,
    advancePick,
    simulateSeason,
    resetGame,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextType {
  const context = React.useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
