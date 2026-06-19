import { Team, Player, GameResult, HitterStats, PitcherStats } from '../types'

// ============================================================================
// TYPES & INTERFACES FOR EVENT-BASED SIMULATION
// ============================================================================

interface BaseRunnerState {
  first: Player | null  // player on first base
  second: Player | null // player on second base
  third: Player | null  // player on third base
}



interface PitcherPerformance {
  pitcher: Player
  ip: number        // innings pitched (fractional)
  pitches: number   // pitch count
  fatigue: number   // 0-1 scale (1 = exhausted)
}

interface AtBatRecord {
  batter: Player
  pitcher: Player
  outcome: 'hit' | 'out' | 'walk' | 'strikeout'
  hitType?: 'single' | 'double' | 'triple' | 'homerun'
  runsScored: number    // runs that scored on this at-bat
  rbi: number          // rbis credited to batter
  stolenBases: Player[] // runners who stole bases on this at-bat
  isEarnedRun: boolean // was this an earned run (not an error)?
}

interface PitcherPerformanceRecord {
  pitcher: Player
  ip: number
  pitches: number
  hitsAllowed: number
  earnedRuns: number
  walksAllowed: number
  strikeouts: number
  isSave: boolean
}



// Clamp value between min/max
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// Box-Muller for normal distribution (kept for variance)
function boxMuller(mean: number = 0, stddev: number = 1): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stddev
}

// ============================================================================
// LINEUP CONSTRUCTION
// ============================================================================

// Choose a 9-player starting lineup: C,1B,2B,3B,SS,LF,CF,RF + DH
// Rotates bench players into DH position based on gameIndex (weighted toward starters)
function chooseLineup(team: Team, gameIndex: number = 0): Player[] {
  const hitters = team.roster.filter((p) => p.type === 'hitter')
  const chosen = new Set<string>()
  const lineup: Player[] = []

  const defensiveSlots: Array<"C"|"1B"|"2B"|"3B"|"SS"|"LF"|"CF"|"RF"> = [
    'C','1B','2B','3B','SS','LF','CF','RF'
  ]

  // Fill 8 defensive positions with best available players at each position
  for (const pos of defensiveSlots) {
    const candidate = hitters
      .filter((h) => h.position === pos && !chosen.has(h.id))
      .sort((a, b) => (b.overall || 0) - (a.overall || 0))[0]

    if (candidate) {
      lineup.push(candidate)
      chosen.add(candidate.id)
    } else {
      // fallback: best available hitter not yet chosen
      const fallback = hitters
        .filter((h) => !chosen.has(h.id))
        .sort((a, b) => (b.overall || 0) - (a.overall || 0))[0]
      if (fallback) {
        lineup.push(fallback)
        chosen.add(fallback.id)
      }
    }
  }

  // DH: rotate bench players with weighted preference for best candidates
  // ~70% of games: use best available from starters/rotation
  // ~30% of games: use bench player rotation
  const benchPlayers = hitters.filter((h) => !chosen.has(h.id))
  
  if (benchPlayers.length > 0) {
    let dh: Player | null = null
    
    // Use gameIndex to determine if this is a "bench player game"
    // Bench players get ~30% of games (so about 2 out of every 6-7 games)
    const benchGameCycle = 7 // Every 7 games, rotate through bench
    const isBenchGameSlot = (gameIndex % benchGameCycle) >= 5 // Last 2 of 7 games
    
    if (isBenchGameSlot && benchPlayers.length > 0) {
      // Rotate through bench players
      const benchIndex = Math.floor((gameIndex / benchGameCycle) % benchPlayers.length)
      dh = benchPlayers[benchIndex]
    } else {
      // Use highest-scoring hitter from bench (best DH candidate)
      dh = benchPlayers.sort((a, b) => {
        // Score based on hitting ability (contact + power) minus fielding penalty
        const scoreA = ((a.contact || 50) + (a.power || 50)) * 0.5 - (a.fielding || 50) * 0.3
        const scoreB = ((b.contact || 50) + (b.power || 50)) * 0.5 - (b.fielding || 50) * 0.3
        return scoreB - scoreA
      })[0]
    }
    
    if (dh) {
      lineup.push(dh)
      chosen.add(dh.id)
    }
  }

  return lineup.slice(0, 9)
}

// Get the starting pitcher for a team using round-robin rotation
function getStartingPitcher(team: Team, gameIndex: number): Player | null {
  const sps = team.roster
    .filter((p) => p.position === 'SP')
    .sort((a, b) => (b.overall || 0) - (a.overall || 0))
  
  if (sps.length === 0) return null
  
  // Round-robin: cycle through SPs based on game number
  const spIndex = gameIndex % sps.length
  return sps[spIndex]
}

// Get relief pitchers for a team (sorted by overall rating)
function getReliefPitchers(team: Team): Player[] {
  const rps = team.roster
    .filter((p) => p.position === 'RP')
    .sort((a, b) => (b.overall || 0) - (a.overall || 0))
  const cls = team.roster
    .filter((p) => p.position === 'CL')
    .sort((a, b) => (b.overall || 0) - (a.overall || 0))
  return [...rps, ...cls]
}

/**
 * Calculate ERA for a pitcher performance record
 */
function calculateERA(perf: PitcherPerformanceRecord): number {
  if (perf.ip === 0) return 0
  return (perf.earnedRuns * 9) / perf.ip
}

/**
 * Check if a relief pitcher has exceeded season limits
 * Limits: RP max 65 appearances and 75 IP; CL max 60 appearances and 70 IP
 */
function isReliewerOverused(pitcher: Player): boolean {
  if (pitcher.position !== 'RP' && pitcher.position !== 'CL') return false
  
  const stats = pitcher.stats as PitcherStats | undefined
  if (!stats) return false
  
  const isCloser = pitcher.position === 'CL'
  const maxAppearances = isCloser ? 60 : 65
  const maxInnings = isCloser ? 70 : 75
  
  return stats.G >= maxAppearances || stats.IP >= maxInnings
}

// ============================================================================
// AT-BAT & PITCH SIMULATION
// ============================================================================

/**
 * Simulate a single pitch. Returns true if strike, false if ball.
 * Considers pitcher stuff/accuracy and batter contact/discipline with variance.
 */
function simulatePitch(pitcher: Player, batter: Player): boolean {
  // Pitcher's stuff affects strike probability (baseline 50%)
  const stuffRate = (pitcher.stuff || 50) / 99
  const strikeProb = 0.50 + stuffRate * 0.25  // 50-75%, elite pitchers better at hitting zone
  
  // Pitcher's accuracy helps throw strikes
  const accuracyRate = (pitcher.accuracy || 50) / 99
  const accuracyBonus = accuracyRate * 0.08  // +8% max from accuracy
  
  // Batter's contact reduces strike probability (harder to fool)
  const contactRate = (batter.contact || 50) / 99
  const disciplineRate = (batter.discipline || 50) / 99
  const contactPenalty = contactRate * 0.08  // -8% max from contact
  const disciplinePenalty = disciplineRate * 0.05  // -5% max from discipline
  
  const adjustedStrikeProb = clamp(strikeProb + accuracyBonus - contactPenalty - disciplinePenalty, 0.25, 0.75)
  
  return Math.random() < adjustedStrikeProb
}

/**
 * Simulate the outcome of a ball in play.
 * Returns hit type or null for out.
 */
function simulateContactOutcome(batter: Player, pitcher: Player): 'single' | 'double' | 'triple' | 'homerun' | 'out' {
  const contact = batter.contact || 50
  const power = batter.power || 50
  const stuff = pitcher.stuff || 50
  const accuracy = pitcher.accuracy || 50
  
  // Probability of making solid contact (not weak/strikeout swing)
  // Better contact skills significantly improve this
  // INCREASED to 70-90% to match realistic contact rates
  const contactRate = 0.70 + (contact / 99) * 0.20  // 70-90% contact rate when swinging
  
  // If no solid contact, it's an out (weak contact/strikeout swing)
  if (Math.random() > contactRate) {
    return 'out'
  }
  
  // Determine hit type based on power and pitcher effectiveness using CUMULATIVE probabilities
  // High-stuff pitchers reduce hit rates on balls in play
  // Low-accuracy pitchers give up more hits (less command = more hittable pitches)
  const powerRate = power / 99
  const stuffRate = stuff / 99     // Higher stuff = fewer hits
  const accuracyRate = accuracy / 99  // Lower accuracy = more hits (worse command)
  const hitRoll = Math.random()
  
  let cumulative = 0
  
  // Home run: 5% base + powerRate * 9%, reduced by pitcher stuff
  const hrProb = clamp(0.05 + powerRate * 0.09 - stuffRate * 0.01, 0.02, 0.14)
  if (hitRoll < (cumulative += hrProb)) {
    return 'homerun'
  }
  
  // Triple: 1% base + powerRate * 1.5% = 1-2.5%
  const tripleProb = 0.01 + powerRate * 0.015
  if (hitRoll < (cumulative += tripleProb)) {
    return 'triple'
  }
  
  // Double: 8% base + contact * 2.5%, reduced by pitcher stuff, boosted by low accuracy
  const doubleProb = clamp(0.08 + (contact / 99) * 0.025 - stuffRate * 0.01 + (1 - accuracyRate) * 0.01, 0.05, 0.14)
  if (hitRoll < (cumulative += doubleProb)) {
    return 'double'
  }
  
  // Single: 32% base + contact * 14%, reduced by pitcher stuff, boosted by low accuracy
  const singleProb = clamp(0.32 + (contact / 99) * 0.14 - stuffRate * 0.02 + (1 - accuracyRate) * 0.03, 0.25, 0.50)
  if (hitRoll < (cumulative += singleProb)) {
    return 'single'
  }
  
  // Out (weak contact/double play): everything else (~10-20%)
  return 'out'
}

/**
 * Simulate baserunning events (stolen bases) that happen between pitches.
 * Called once per pitch in the at-bat loop.
 * Only second and third base can be stolen (not first).
 * Returns array of runners who stole on this pitch.
 */
function simulateBaserunningEvents(runners: BaseRunnerState): { stolenBases: Player[] } {
  const stolenBases: Player[] = []
  
  // Runner on FIRST can steal SECOND (but only if second is not occupied)
  // Stealing first → second is more common than stealing second → third
  if (runners.first && !runners.second) {
    const speed = runners.first.speed || 50
    // Speed 99: 8%, Speed 80: 2.5%, Speed 50: 0.3%, Speed 30: 0.03%
    const stealChance = Math.pow(speed / 99, 2.5) * 0.08
    
    if (Math.random() < stealChance) {
      stolenBases.push(runners.first)
      runners.second = runners.first
      runners.first = null
    }
  }
  
  // Runner on SECOND can steal THIRD (but only if third is not occupied)
  // Stealing second → third is less common than stealing first → second
  if (runners.second && !runners.third) {
    const speed = runners.second.speed || 50
    // Speed 99: 5%, Speed 80: 1.5%, Speed 50: 0.2%, Speed 30: 0.01%
    const stealChance = Math.pow(speed / 99, 2.5) * 0.05
    
    if (Math.random() < stealChance) {
      stolenBases.push(runners.second)
      runners.third = runners.second
      runners.second = null
    }
  }
  
  return { stolenBases }
}

/**
 * Simulate a complete at-bat.
 * Returns: { outcome, hitType?, rbiCount, basesAdvanced }
 */
function simulateAtBat(
  batter: Player,
  pitcher: Player,
  runners: BaseRunnerState
): {
  outcome: 'hit' | 'out' | 'walk' | 'strikeout'
  hitType?: 'single' | 'double' | 'triple' | 'homerun'
  newRunners: BaseRunnerState
  runsScored: number
  rbis: number
  isOut: boolean
  stolenBases: Player[]
} {
  let balls = 0
  let strikes = 0
  
  // Pitch-by-pitch simulation
  let outcome: 'hit' | 'out' | 'walk' | 'strikeout' | null = null
  const allStolenBases: Player[] = [] // Accumulate stolen bases across all pitches
  
  while (outcome === null) {
    // If we reach a full count, batter walks
    if (balls === 4) {
      outcome = 'walk'
      break
    }
    
    // If we reach 3 strikes, batter strikes out
    if (strikes === 3) {
      outcome = 'strikeout'
      break
    }
    
    // Simulate a pitch
    const isStrike = simulatePitch(pitcher, batter)
    
    if (isStrike) {
      // Batter must swing or take the strike
      // At higher strike counts, batter forced to be more aggressive
      // Disciplined hitters lay off more pitches on 2 strikes, reducing strikeouts
      const baseMustSwingChance = 0.45 + (strikes * 0.20) // 45%, 65%, 85% as strikes increase
      const disciplineRate = (batter.discipline || 50) / 99
      const adjustedMustSwingChance = baseMustSwingChance - (disciplineRate * 0.15) // Up to -15% swing rate
      const mustSwingChance = Math.max(0.25, adjustedMustSwingChance) // Never below 25%
      
      if (Math.random() < mustSwingChance) {
        // Batter swings at strike
        const contactOutcome = simulateContactOutcome(batter, pitcher)
        if (contactOutcome === 'out') {
          outcome = 'strikeout' // strikeout on swung-at strike
        } else {
          outcome = 'hit'
          break
        }
      } else {
        // Batter takes the strike
        strikes += 1
      }
    } else {
      // Ball pitched - batter rarely swings at balls
      const swingAtBallChance = 0.12 // 12% chance to swing at bad pitch
      
      if (Math.random() < swingAtBallChance) {
        // Batter swings at ball
        const contactOutcome = simulateContactOutcome(batter, pitcher)
        if (contactOutcome === 'out') {
          outcome = 'out' // out on swung-at ball (weak swing)
        } else {
          outcome = 'hit'
          break
        }
      } else {
        // Batter takes the ball
        balls += 1
      }
    }
    
    // Check for stolen bases between each pitch (runners try to advance)
    const brEvents = simulateBaserunningEvents(runners)
    allStolenBases.push(...brEvents.stolenBases)
  }
  
  let newRunners: BaseRunnerState = { ...runners }
  let runsScored = 0
  let rbis = 0
  let hitType: 'single' | 'double' | 'triple' | 'homerun' | undefined
  
  if (outcome === 'hit') {
    // Batter swung and made contact
    const contactOutcome = simulateContactOutcome(batter, pitcher)
    
    if (contactOutcome === 'out') {
      outcome = 'out'
    } else {
      hitType = contactOutcome
      // We have a hit - advance runners
      runsScored = advanceRunners(hitType, newRunners)
      rbis = runsScored + (runsScored > 0 ? 1 : 0) // batter credit for at least 1 RBI if hit scores any run
      
      // Place batter on base
      if (hitType === 'single') {
        placeRunnerOnFirst(batter, newRunners)
      } else if (hitType === 'double') {
        placeRunnerOnSecond(batter, newRunners)
      } else if (hitType === 'triple') {
        placeRunnerOnThird(batter, newRunners)
      } else if (hitType === 'homerun') {
        runsScored += 1 // batter scores too
        rbis = countRunnersOnBase(runners) + 1 // RBI for all runners + self
      }
    }
  }
  
  return {
    outcome: outcome!,
    hitType: hitType as any,
    newRunners,
    runsScored,
    rbis,
    isOut: outcome === 'out' || outcome === 'strikeout',
    stolenBases: allStolenBases
  }
}

// ============================================================================
// BASERUNNING LOGIC
// ============================================================================

function countRunnersOnBase(runners: BaseRunnerState): number {
  return (runners.first ? 1 : 0) + (runners.second ? 1 : 0) + (runners.third ? 1 : 0)
}

function placeRunnerOnFirst(player: Player, runners: BaseRunnerState): void {
  // If bases loaded, push runners
  if (runners.first && runners.second && runners.third) {
    runners.third = runners.second
    runners.second = runners.first
  } else if (runners.first && runners.second) {
    runners.second = runners.third || runners.second
  } else if (runners.first) {
    runners.second = runners.first
  }
  runners.first = player
}

function placeRunnerOnSecond(player: Player, runners: BaseRunnerState): void {
  if (runners.first && runners.second && runners.third) {
    runners.third = runners.second
  } else if (runners.first && runners.second) {
    runners.third = runners.second
  }
  if (runners.first && !runners.second) {
    runners.second = runners.first
  }
  runners.second = player
  runners.first = null
}

function placeRunnerOnThird(player: Player, runners: BaseRunnerState): void {
  if (runners.third) {
    // Third is occupied; bases loaded
  }
  runners.third = player
  runners.first = null
  runners.second = null
}

/**
 * Advance runners based on hit type. Returns number of runs scored.
 */
function advanceRunners(hitType: 'single' | 'double' | 'triple' | 'homerun', runners: BaseRunnerState): number {
  let scored = 0
  
  if (hitType === 'homerun') {
    scored = countRunnersOnBase(runners)
    runners.first = null
    runners.second = null
    runners.third = null
    return scored
  }
  
  if (hitType === 'triple') {
    if (runners.third) scored += 1
    if (runners.second) scored += 1
    if (runners.first) scored += 1
    runners.first = null
    runners.second = null
    runners.third = null
    return scored
  }
  
  if (hitType === 'double') {
    // Runner on third scores
    if (runners.third) scored += 1
    // Runner on second scores (on most doubles)
    if (runners.second) scored += 1
    // Runner on first goes to third
    if (runners.first) {
      runners.third = runners.first
    }
    runners.second = null
    runners.first = null
    return scored
  }
  
  if (hitType === 'single') {
    // Runner on third scores
    if (runners.third) scored += 1
    // Runner on second goes to third
    if (runners.second) {
      runners.third = runners.second
      runners.second = null
    }
    // Runner on first goes to second
    if (runners.first) {
      runners.second = runners.first
      runners.first = null
    }
    return scored
  }
  
  return scored
}

/**
 * Process a walk: advance runner on third if bases loaded, place batter on first
 */
function processWalk(batter: Player, runners: BaseRunnerState): { newRunners: BaseRunnerState, runsScored: number } {
  const newRunners = { ...runners }
  let runsScored = 0
  
  // Bases loaded: runner on third scores
  if (newRunners.first && newRunners.second && newRunners.third) {
    runsScored = 1
    // Advance everyone
    newRunners.first = batter
    newRunners.second = newRunners.second
    newRunners.third = newRunners.third
  } else if (newRunners.first && newRunners.second) {
    // First and second occupied
    newRunners.third = newRunners.second
    newRunners.second = newRunners.first
    newRunners.first = batter
  } else if (newRunners.first) {
    // First occupied
    newRunners.second = newRunners.first
    newRunners.first = batter
  } else {
    // First empty
    newRunners.first = batter
  }
  
  return { newRunners, runsScored }
}

// ============================================================================
// PITCHER MANAGEMENT
// ============================================================================

/**
 * Determine if a pitcher should be replaced.
 * Considerations: pitch count, innings pitched, fatigue, game situation
 */
function shouldReplacePitcher(
  performance: PitcherPerformance,
  inning: number,
  _outs: number,
  teamLeadRuns: number
): boolean {
  // Starter leaving:
  // - Usually after 6 innings or 90+ pitches
  // - Earlier if struggling or trailing
  if (performance.pitcher.position === 'SP') {
    if (inning > 6 || performance.pitches > 90) return true
    if (inning > 5 && (performance.pitches > 75 || performance.fatigue > 0.7)) return true
    if (teamLeadRuns < 0 && inning > 4 && performance.pitches > 70) return true
    return false
  }
  
  // Reliever leaving:
  // - After 1-2 IP or high pitch counts
  // - If they were just used
  if (performance.pitcher.position === 'RP') {
    if (performance.ip >= 1.2) return true
    if (performance.pitches > 30) return true
    return false
  }
  
  // Closer:
  // - Only used in save situations (late innings, small lead)
  if (performance.pitcher.position === 'CL') {
    if (performance.ip >= 1) return true
    if (performance.pitches > 20) return true
    return false
  }
  
  return false
}

// ============================================================================
// GAME SIMULATION
// ============================================================================

export function simulateGame(homeTeam: Team, awayTeam: Team, gameIndex: number = 0): {
  homeScore: number
  awayScore: number
  homeLineup: Player[]
  awayLineup: Player[]
  homePitchers: Player[]
  awayPitchers: Player[]
  homeAtBats: AtBatRecord[]
  awayAtBats: AtBatRecord[]
  homePitcherPerf: PitcherPerformanceRecord[]
  awayPitcherPerf: PitcherPerformanceRecord[]
  winningPitcher: Player | null
  losingPitcher: Player | null
  savePitcher: Player | null
  homeStartingPitcher: Player | null
  awayStartingPitcher: Player | null
} {
  const homeLineup = chooseLineup(homeTeam, gameIndex)
  const awayLineup = chooseLineup(awayTeam, gameIndex)
  
  // Initialize pitchers with rotation
  let homePitcher: Player | null = getStartingPitcher(homeTeam, gameIndex)
  let awayPitcher: Player | null = getStartingPitcher(awayTeam, gameIndex)
  
  if (!homePitcher || !awayPitcher) {
    // Fallback if no pitchers (shouldn't happen)
    return { 
      homeScore: 0, 
      awayScore: 0, 
      homeLineup, 
      awayLineup, 
      homePitchers: [], 
      awayPitchers: [], 
      homeAtBats: [], 
      awayAtBats: [],
      homePitcherPerf: [],
      awayPitcherPerf: [],
      winningPitcher: null,
      losingPitcher: null,
      savePitcher: null,
      homeStartingPitcher: null,
      awayStartingPitcher: null,
    }
  }
  
  const homePitcherPerf: Map<string, PitcherPerformance> = new Map()
  const awayPitcherPerf: Map<string, PitcherPerformance> = new Map()
  
  homePitcherPerf.set(homePitcher.id, { pitcher: homePitcher, ip: 0, pitches: 0, fatigue: 0 })
  awayPitcherPerf.set(awayPitcher.id, { pitcher: awayPitcher, ip: 0, pitches: 0, fatigue: 0 })
  
  let homeScore = 0
  let awayScore = 0
  
  const homeAtBats: AtBatRecord[] = []
  const awayAtBats: AtBatRecord[] = []
  
  // Loop through 9 innings
  for (let inning = 1; inning <= 9; inning++) {
    // AWAY HALF
    const awayInningResult = simulateHalfInning(
      awayLineup,
      homePitcher,
      homePitcherPerf.get(homePitcher.id)!,
      homeTeam,
      getReliefPitchers(homeTeam),
      inning,
      homeScore - awayScore
    )
    awayScore += awayInningResult.runsScored
    awayAtBats.push(...awayInningResult.atBats)
    
    // Check if pitcher needs replacement
    let currentHomePitcher = homePitcherPerf.get(homePitcher.id)!
    if (shouldReplacePitcher(currentHomePitcher, inning, 0, homeScore - awayScore)) {
      const relieverPool = getReliefPitchers(homeTeam)
      for (const rp of relieverPool) {
        if (!homePitcherPerf.has(rp.id) && !isReliewerOverused(rp)) {
          homePitcher = rp
          homePitcherPerf.set(rp.id, { pitcher: rp, ip: 0, pitches: 0, fatigue: 0 })
          break
        }
      }
    }
    
    // HOME HALF
    const homeInningResult = simulateHalfInning(
      homeLineup,
      awayPitcher,
      awayPitcherPerf.get(awayPitcher.id)!,
      awayTeam,
      getReliefPitchers(awayTeam),
      inning,
      homeScore - awayScore
    )
    homeScore += homeInningResult.runsScored
    homeAtBats.push(...homeInningResult.atBats)
    
    // Check if pitcher needs replacement
    let currentAwayPitcher = awayPitcherPerf.get(awayPitcher.id)!
    if (shouldReplacePitcher(currentAwayPitcher, inning, 0, awayScore - homeScore)) {
      const relieverPool = getReliefPitchers(awayTeam)
      for (const rp of relieverPool) {
        if (!awayPitcherPerf.has(rp.id) && !isReliewerOverused(rp)) {
          awayPitcher = rp
          awayPitcherPerf.set(rp.id, { pitcher: rp, ip: 0, pitches: 0, fatigue: 0 })
          break
        }
      }
    }
  }
  
  // No ties
  if (homeScore === awayScore) {
    homeScore += 1
  }
  
  // Collect pitchers used and build performance records
  const homePitchers = Array.from(homePitcherPerf.values()).map(p => p.pitcher)
  const awayPitchers = Array.from(awayPitcherPerf.values()).map(p => p.pitcher)
  
  // Calculate pitcher performance records (hits allowed, ER, SO, BB)
  const homePitcherPerformances: PitcherPerformanceRecord[] = Array.from(homePitcherPerf.values()).map((perf) => {
    const pitcherAtBats = awayAtBats.filter(ab => ab.pitcher.id === perf.pitcher.id)
    const hitsAllowed = pitcherAtBats.filter(ab => ab.outcome === 'hit').length
    const earnedRuns = pitcherAtBats.filter(ab => ab.isEarnedRun).reduce((sum, ab) => sum + ab.runsScored, 0)
    const walksAllowed = pitcherAtBats.filter(ab => ab.outcome === 'walk').length
    const strikeouts = pitcherAtBats.filter(ab => ab.outcome === 'strikeout').length
    
    return {
      pitcher: perf.pitcher,
      ip: perf.ip,
      pitches: perf.pitches,
      hitsAllowed,
      earnedRuns,
      walksAllowed,
      strikeouts,
      isSave: false,
    }
  })
  
  const awayPitcherPerformances: PitcherPerformanceRecord[] = Array.from(awayPitcherPerf.values()).map((perf) => {
    const pitcherAtBats = homeAtBats.filter(ab => ab.pitcher.id === perf.pitcher.id)
    const hitsAllowed = pitcherAtBats.filter(ab => ab.outcome === 'hit').length
    const earnedRuns = pitcherAtBats.filter(ab => ab.isEarnedRun).reduce((sum, ab) => sum + ab.runsScored, 0)
    const walksAllowed = pitcherAtBats.filter(ab => ab.outcome === 'walk').length
    const strikeouts = pitcherAtBats.filter(ab => ab.outcome === 'strikeout').length
    
    return {
      pitcher: perf.pitcher,
      ip: perf.ip,
      pitches: perf.pitches,
      hitsAllowed,
      earnedRuns,
      walksAllowed,
      strikeouts,
      isSave: false,
    }
  })
  
  // Determine winning and losing pitchers using MLB rules
  // W: Starter needs ≥5 IP, else best reliever (lowest ERA) gets W
  // L: Pitcher who allowed go-ahead run (approximate: worst reliever/last pitcher for losing side)
  // SV: Finishing pitcher, not W, ≥1/3 IP, and meets one of three conditions
  
  let winningPitcher: Player | null = null
  let losingPitcher: Player | null = null
  let savePitcher: Player | null = null
  
  if (homeScore > awayScore) {
    // Home team won
    // Winning pitcher: check if home starter has ≥5 IP
    const homeStarterPerf = homePitcherPerformances.find(p => p.pitcher.id === homePitcher?.id)
    if (homeStarterPerf && homeStarterPerf.ip >= 5) {
      winningPitcher = homePitcher
    } else {
      // Find reliever with lowest ERA (best performance)
      let bestReliever: PitcherPerformanceRecord | null = null
      let bestERA = Infinity
      for (const perf of homePitcherPerformances) {
        if (perf.pitcher.id !== homePitcher?.id && perf.ip >= 0.33) {
          const era = calculateERA(perf)
          if (era < bestERA) {
            bestERA = era
            bestReliever = perf
          }
        }
      }
      winningPitcher = bestReliever?.pitcher || homePitcher
    }
    
    // Losing pitcher: away starter (they got the loss)
    losingPitcher = awayPitcher
    
    // Save: last pitcher in awayAtBats (home team's relief) if eligible
    for (let i = awayAtBats.length - 1; i >= 0; i--) {
      const lastPitcher = awayAtBats[i].pitcher
      const perfRecord = homePitcherPerformances.find(p => p.pitcher.id === lastPitcher.id)
      
      if (perfRecord && 
          lastPitcher.id !== winningPitcher?.id && // Not winning pitcher
          perfRecord.ip >= (1/3) && // At least 1/3 inning
          (lastPitcher.position === 'RP' || lastPitcher.position === 'CL')) { // Relief pitcher
        
        // Check save conditions:
        // Condition A: Lead ≤3 runs when entering + pitched ≥1 IP
        // Condition C: Pitched ≥3 IP
        const conditionA = (homeScore - awayScore <= 3) && perfRecord.ip >= 1
        const conditionC = perfRecord.ip >= 3
        
        if (conditionA || conditionC) {
          savePitcher = lastPitcher
        }
        break
      }
    }
  } else {
    // Away team won
    // Winning pitcher: check if away starter has ≥5 IP
    const awayStarterPerf = awayPitcherPerformances.find(p => p.pitcher.id === awayPitcher?.id)
    if (awayStarterPerf && awayStarterPerf.ip >= 5) {
      winningPitcher = awayPitcher
    } else {
      // Find reliever with lowest ERA (best performance)
      let bestReliever: PitcherPerformanceRecord | null = null
      let bestERA = Infinity
      for (const perf of awayPitcherPerformances) {
        if (perf.pitcher.id !== awayPitcher?.id && perf.ip >= 0.33) {
          const era = calculateERA(perf)
          if (era < bestERA) {
            bestERA = era
            bestReliever = perf
          }
        }
      }
      winningPitcher = bestReliever?.pitcher || awayPitcher
    }
    
    // Losing pitcher: home starter (they got the loss)
    losingPitcher = homePitcher
    
    // Save: last pitcher in homeAtBats (away team's relief) if eligible
    for (let i = homeAtBats.length - 1; i >= 0; i--) {
      const lastPitcher = homeAtBats[i].pitcher
      const perfRecord = awayPitcherPerformances.find(p => p.pitcher.id === lastPitcher.id)
      
      if (perfRecord && 
          lastPitcher.id !== winningPitcher?.id && // Not winning pitcher
          perfRecord.ip >= (1/3) && // At least 1/3 inning
          (lastPitcher.position === 'RP' || lastPitcher.position === 'CL')) { // Relief pitcher
        
        // Check save conditions:
        // Condition A: Lead ≤3 runs when entering + pitched ≥1 IP
        // Condition C: Pitched ≥3 IP
        const conditionA = (awayScore - homeScore <= 3) && perfRecord.ip >= 1
        const conditionC = perfRecord.ip >= 3
        
        if (conditionA || conditionC) {
          savePitcher = lastPitcher
        }
        break
      }
    }
  }
  
  // Fallback to the stored starting pitchers if we couldn't find them from atBats
  if (!winningPitcher) {
    winningPitcher = homeScore > awayScore ? homePitcher : awayPitcher
  }
  if (!losingPitcher) {
    losingPitcher = homeScore > awayScore ? awayPitcher : homePitcher
  }
  
  return { 
    homeScore, 
    awayScore, 
    homeLineup, 
    awayLineup, 
    homePitchers, 
    awayPitchers, 
    homeAtBats, 
    awayAtBats,
    homePitcherPerf: homePitcherPerformances,
    awayPitcherPerf: awayPitcherPerformances,
    winningPitcher,
    losingPitcher,
    savePitcher,
    homeStartingPitcher: homePitcher,
    awayStartingPitcher: awayPitcher,
  }
}

/**
 * Simulate one half of an inning (3 outs).
 * Returns list of at-bat records and total runs scored that half-inning.
 */
function simulateHalfInning(
  battingLineup: Player[],
  pitcher: Player,
  pitcherPerf: PitcherPerformance,
  _pitchingTeam: Team,
  reliefPool: Player[],
  inning: number,
  teamLeadRuns: number
): { atBats: AtBatRecord[], runsScored: number } {
  let outs = 0
  let runsThisInning = 0
  let lineupIndex = inning * 3 % battingLineup.length // stagger based on inning
  const runners: BaseRunnerState = { first: null, second: null, third: null }
  const atBats: AtBatRecord[] = []
  
  while (outs < 3) {
    // Get next batter
    const batter = battingLineup[lineupIndex % battingLineup.length]
    lineupIndex += 1
    
    // Check if pitcher needs to be replaced (mid-inning)
    if (shouldReplacePitcher(pitcherPerf, inning, outs, teamLeadRuns)) {
      for (const rp of reliefPool) {
        if (rp.id !== pitcher.id && !isReliewerOverused(rp)) {
          pitcher = rp
          // Create new perf tracker for this reliever
          pitcherPerf = { pitcher: rp, ip: 0, pitches: 0, fatigue: 0 }
          break
        }
      }
    }
    
    // Simulate at-bat
    const atBatResult = simulateAtBat(batter, pitcher, runners)
    pitcherPerf.pitches += Math.floor(boxMuller(4, 1.5)) // avg ~4 pitches per AB
    
    // Record the at-bat
    const record: AtBatRecord = {
      batter,
      pitcher,
      outcome: atBatResult.outcome,
      hitType: atBatResult.hitType,
      runsScored: atBatResult.runsScored,
      rbi: atBatResult.rbis,
      stolenBases: atBatResult.stolenBases,
      isEarnedRun: true, // all runs are earned (no error tracking in this sim)
    }
    atBats.push(record)
    
    if (atBatResult.outcome === 'strikeout' || atBatResult.outcome === 'out') {
      outs += 1
    } else if (atBatResult.outcome === 'walk') {
      const walkResult = processWalk(batter, runners)
      runsThisInning += walkResult.runsScored
      Object.assign(runners, walkResult.newRunners)
    } else if (atBatResult.outcome === 'hit') {
      runsThisInning += atBatResult.runsScored
      Object.assign(runners, atBatResult.newRunners)
    }
  }
  
  // IP tracking: 0.1 per out (3 outs = 1 IP)
  pitcherPerf.ip += outs / 3
  
  return { atBats, runsScored: runsThisInning }
}

// ============================================================================
// STAT ACCUMULATION (Event-Based)
// ============================================================================

function initializeHitterStats(): HitterStats {
  return {
    G: 0,
    AB: 0,
    H: 0,
    HR: 0,
    RBI: 0,
    R: 0,
    BB: 0,
    SO: 0,
    SB: 0,
    AVG: '.000',
    OBP: '.000',
    SLG: '.000',
    OPS: '.000',
  }
}

function initializePitcherStats(): PitcherStats {
  return {
    G: 0,
    GS: 0,
    W: 0,
    L: 0,
    SV: 0,
    IP: 0,
    H: 0,
    ER: 0,
    BB: 0,
    SO: 0,
    ERA: '0.00',
    WHIP: '0.00',
  }
}

function calculateDerivedStats(hitterStats: HitterStats): HitterStats {
  const avg = hitterStats.AB > 0 ? (hitterStats.H / hitterStats.AB).toFixed(3) : '.000'
  const obp =
    hitterStats.AB + hitterStats.BB > 0
      ? ((hitterStats.H + hitterStats.BB) / (hitterStats.AB + hitterStats.BB)).toFixed(3)
      : '.000'
  const slg = hitterStats.AB > 0 ? ((hitterStats.H + hitterStats.HR * 2) / hitterStats.AB).toFixed(3) : '.000'
  const ops = (parseFloat(obp) + parseFloat(slg)).toFixed(3)

  return {
    ...hitterStats,
    AVG: avg,
    OBP: obp,
    SLG: slg,
    OPS: ops,
  }
}

function calculatePitcherDerivedStats(pitcherStats: PitcherStats): PitcherStats {
  const era = pitcherStats.IP > 0 ? ((pitcherStats.ER * 9) / pitcherStats.IP).toFixed(2) : '0.00'
  const whip = pitcherStats.IP > 0 ? (((pitcherStats.H + pitcherStats.BB) / pitcherStats.IP)).toFixed(2) : '0.00'

  return {
    ...pitcherStats,
    ERA: era,
    WHIP: whip,
  }
}

/**
 * Accumulate hitter statistics based on at-bat outcome
 * Note: G (games) is incremented separately at the game level, not per at-bat
 */
function recordHitterAtBat(
  player: Player,
  record: AtBatRecord
): void {
  if (player.type !== 'hitter') return

  let stats = (player.stats as HitterStats) || initializeHitterStats()
  // G is NOT incremented here - it's incremented once per game at the game level

  // At-bat logic
  if (record.outcome === 'walk') {
    stats.BB += 1
  } else {
    // All non-walks are at-bats
    stats.AB += 1
    
    if (record.outcome === 'hit') {
      stats.H += 1
      if (record.hitType === 'homerun') {
        stats.HR += 1
      } else if (record.hitType === 'triple') {
        // Triples counted in H, but not as doubles
      } else if (record.hitType === 'double') {
        // Doubles counted in H, but not as triples
      }
      // Runs and RBIs
      if (record.runsScored > 0) {
        stats.R += record.runsScored
      }
      if (record.rbi > 0) {
        stats.RBI += record.rbi
      }
    } else if (record.outcome === 'strikeout') {
      stats.SO += 1
    } else if (record.outcome === 'out') {
      // Just a regular out (counted in AB)
    }
  }

  player.stats = calculateDerivedStats(stats)
}

// Note: recordPitcherAtBat is no longer used - pitcher stats are accumulated via pitcher performance records

// ============================================================================
// SEASON SIMULATION
// ============================================================================

// Simulate all games and accumulate stats
export function simulateAllGames(teams: Team[], schedule: GameResult[]): Team[] {
  const updatedTeams = JSON.parse(JSON.stringify(teams)) as Team[]
  const teamMap = new Map(updatedTeams.map((t) => [t.id, t]))
  
  // Track how many games each team has played (for SP rotation)
  const gamesPlayedByTeam = new Map<string, number>()
  updatedTeams.forEach(team => {
    gamesPlayedByTeam.set(team.id, 0)
  })

  schedule.forEach((gameOverride) => {
    const homeTeam = teamMap.get(gameOverride.homeTeamId)
    const awayTeam = teamMap.get(gameOverride.awayTeamId)

    if (!homeTeam || !awayTeam) return

    const homeGameIndex = gamesPlayedByTeam.get(homeTeam.id) || 0
    const awayGameIndex = gamesPlayedByTeam.get(awayTeam.id) || 0
    
    // Pass the game index for SP rotation
    const result = simulateGame(homeTeam, awayTeam, Math.max(homeGameIndex, awayGameIndex))
    const homeScore = result.homeScore
    const awayScore = result.awayScore
    const homeAtBats = result.homeAtBats
    const awayAtBats = result.awayAtBats
    const homePitcherPerf = result.homePitcherPerf
    const awayPitcherPerf = result.awayPitcherPerf
    const winningPitcher = result.winningPitcher
    const losingPitcher = result.losingPitcher
    const savePitcher = result.savePitcher

    const homeWins = homeScore > awayScore
    const awayWins = awayScore > homeScore

    // Update team records
    if (homeWins) {
      homeTeam.wins += 1
      awayTeam.losses += 1
    } else {
      homeTeam.losses += 1
      awayTeam.wins += 1
    }
    
    // Track games played for rotation
    gamesPlayedByTeam.set(homeTeam.id, homeGameIndex + 1)
    gamesPlayedByTeam.set(awayTeam.id, awayGameIndex + 1)

    // Record hitter stats from actual at-bat results
    // First, collect all players who batted in this game for G increment
    const battersTodayHome = new Set<string>()
    const battersTodayAway = new Set<string>()
    
    homeAtBats.forEach((record) => {
      battersTodayHome.add(record.batter.id)
      recordHitterAtBat(record.batter, record)
    })

    awayAtBats.forEach((record) => {
      battersTodayAway.add(record.batter.id)
      recordHitterAtBat(record.batter, record)
    })
    
    // Increment G once per game for each player who participated
    battersTodayHome.forEach((batterId) => {
      const batter = homeTeam.roster.find(p => p.id === batterId)
      if (batter && batter.stats && batter.type === 'hitter') {
        (batter.stats as HitterStats).G += 1
      }
    })
    
    battersTodayAway.forEach((batterId) => {
      const batter = awayTeam.roster.find(p => p.id === batterId)
      if (batter && batter.stats && batter.type === 'hitter') {
        (batter.stats as HitterStats).G += 1
      }
    })

    // Record stolen bases for runners
    homeAtBats.forEach((record) => {
      record.stolenBases.forEach((runner) => {
        if (runner.type === 'hitter' && runner.stats) {
          const stats = runner.stats as HitterStats
          stats.SB += 1
        }
      })
    })

    awayAtBats.forEach((record) => {
      record.stolenBases.forEach((runner) => {
        if (runner.type === 'hitter' && runner.stats) {
          const stats = runner.stats as HitterStats
          stats.SB += 1
        }
      })
    })

    // Record pitcher stats from performance records (IP, ER, H, BB, SO, ERA, WHIP)
    homePitcherPerf.forEach((perf) => {
      const pitcher = perf.pitcher
      pitcher.stats ??= initializePitcherStats()
      const stats = pitcher.stats as PitcherStats
      
      stats.G += 1
      stats.IP += perf.ip
      stats.H += perf.hitsAllowed
      stats.ER += perf.earnedRuns
      stats.BB += perf.walksAllowed
      stats.SO += perf.strikeouts
      
      if (pitcher.position === 'SP') {
        stats.GS += 1
      }
      
      // Assign win/loss: home pitcher gets W if home wins and is winning pitcher, gets L if home loses and is losing pitcher
      if (homeWins && pitcher.id === winningPitcher?.id) {
        stats.W += 1
      } else if (!homeWins && pitcher.id === losingPitcher?.id) {
        stats.L += 1
      }
      
      pitcher.stats = calculatePitcherDerivedStats(stats)
    })

    awayPitcherPerf.forEach((perf) => {
      const pitcher = perf.pitcher
      pitcher.stats ??= initializePitcherStats()
      const stats = pitcher.stats as PitcherStats
      
      stats.G += 1
      stats.IP += perf.ip
      stats.H += perf.hitsAllowed
      stats.ER += perf.earnedRuns
      stats.BB += perf.walksAllowed
      stats.SO += perf.strikeouts
      
      if (pitcher.position === 'SP') {
        stats.GS += 1
      }
      
      // Assign win/loss: away pitcher gets W if away wins and is winning pitcher, gets L if away loses and is losing pitcher
      if (awayWins && pitcher.id === winningPitcher?.id) {
        stats.W += 1
      } else if (!awayWins && pitcher.id === losingPitcher?.id) {
        stats.L += 1
      }
      
      pitcher.stats = calculatePitcherDerivedStats(stats)
    })
    
    // Credit save if applicable
    if (savePitcher && savePitcher.id !== winningPitcher?.id) { // Don't double-count starter as saver
      const savePitcherStats = savePitcher.stats as PitcherStats
      if (savePitcherStats) {
        savePitcherStats.SV += 1
        savePitcher.stats = calculatePitcherDerivedStats(savePitcherStats)
      }
    }
  })

  return updatedTeams
}
