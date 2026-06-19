import { Team, Player, Position } from '../types'

export interface DraftPick {
  pickNumber: number
  round: number
  teamId: string
}

// Build snake draft order for 20 rounds
export function buildSnakeDraftOrder(teamIds: string[]): DraftPick[] {
  const draftOrder: DraftPick[] = []
  const numTeams = teamIds.length
  const numRounds = 20

  for (let round = 1; round <= numRounds; round++) {
    if (round % 2 === 1) {
      // Odd rounds: 1 to 21
      for (let pick = 0; pick < numTeams; pick++) {
        draftOrder.push({
          pickNumber: pick + 1,
          round,
          teamId: teamIds[pick],
        })
      }
    } else {
      // Even rounds: 21 to 1 (reverse)
      for (let pick = numTeams - 1; pick >= 0; pick--) {
        draftOrder.push({
          pickNumber: numTeams - pick,
          round,
          teamId: teamIds[pick],
        })
      }
    }
  }

  return draftOrder
}

// Get required roster slots
export function getRequiredPositions(): { position: Position; count: number }[] {
  return [
    { position: 'C', count: 1 },
    { position: '1B', count: 1 },
    { position: '2B', count: 1 },
    { position: '3B', count: 1 },
    { position: 'SS', count: 1 },
    { position: 'LF', count: 1 },
    { position: 'CF', count: 1 },
    { position: 'RF', count: 1 },
    { position: 'SP', count: 4 },
    { position: 'RP', count: 4 },
    { position: 'CL', count: 1 },
  ]
}

// Get bench slots (any hitter). DH will be filled from bench during games.
export function getBenchCount(): number {
  return 3
}

export function getTotalHitterSlots(): number {
  // Fixed hitter positions (8 defensive slots) + flexible bench
  const fixedHitterSlots = getRequiredPositions().filter((slot) => slot.position !== 'SP' && slot.position !== 'RP' && slot.position !== 'CL').length
  return fixedHitterSlots + getBenchCount()
}

/**
 * Pick a player with some variance - CPU teams randomly pick from
 * the top candidates rather than always the best overall.
 * This creates more realistic draft behavior.
 */
function pickWithVariance(players: Player[], topN: number = 5): Player | null {
  if (players.length === 0) {
    return null
  }

  // Sort by overall descending
  const sorted = [...players].sort((a, b) => b.overall - a.overall)

  // Take top N candidates (or all if fewer than topN)
  const topCandidates = sorted.slice(0, Math.min(topN, sorted.length))

  // Pick randomly from top candidates
  const selectedIndex = Math.floor(Math.random() * topCandidates.length)
  return topCandidates[selectedIndex]
}

// Check which positions a team still needs
export function getTeamNeededPositions(team: Team): { position: Position; count: number }[] {
  const required = getRequiredPositions()

  const needed = required.map((req) => {
    const filled = team.roster.filter((p) => p.position === req.position).length
    return {
      position: req.position,
      count: Math.max(0, req.count - filled),
    }
  })

  return needed.filter((n) => n.count > 0)
}

// CPU auto-draft logic: select best player for team's needs
export function selectBestPlayer(team: Team, availablePlayers: Player[]): Player | null {
  const neededPositions = getTeamNeededPositions(team)

  if (neededPositions.length === 0) {
    // Fixed position needs are filled. If hitter slots are still short,
    // fill flexible DH/bench with best available hitter.
    const hitterCount = team.roster.filter((p) => p.type === 'hitter').length
    const totalHitterSlots = getTotalHitterSlots()
    if (hitterCount < totalHitterSlots) {
      const hitterCandidates = availablePlayers.filter((p) => p.type === 'hitter')
      if (hitterCandidates.length > 0) {
        return pickWithVariance(hitterCandidates)
      }
    }

    // All structural needs are filled, pick best overall available
    return pickWithVariance(availablePlayers)
  }

  // Filter to players at needed positions
  const candidatesAtNeededPos = availablePlayers.filter((p) =>
    neededPositions.some((pos) => pos.position === p.position && pos.count > 0)
  )

  if (candidatesAtNeededPos.length === 0) {
    // No players at needed positions, pick best overall
    return pickWithVariance(availablePlayers)
  }

  // Return a top candidate at needed position (with variance)
  return pickWithVariance(candidatesAtNeededPos)
}
