import { Player, Position, PlayerType } from '../types'
import { FIRST_NAMES, LAST_NAMES } from '../data/seeds'

// Simple UUID v4 generator
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Position distribution for ~1000 players
const POSITION_DISTRIBUTION: { position: Position; count: number; type: PlayerType }[] = [
  { position: 'C', count: 63, type: 'hitter' },
  { position: '1B', count: 63, type: 'hitter' },
  { position: '2B', count: 63, type: 'hitter' },
  { position: '3B', count: 63, type: 'hitter' },
  { position: 'SS', count: 63, type: 'hitter' },
  { position: 'LF', count: 63, type: 'hitter' },
  { position: 'CF', count: 63, type: 'hitter' },
  { position: 'RF', count: 63, type: 'hitter' },
  { position: 'DH', count: 12, type: 'hitter' },
  { position: 'SP', count: 220, type: 'pitcher' },
  { position: 'RP', count: 220, type: 'pitcher' },
  { position: 'CL', count: 50, type: 'pitcher' },
]

// Generate a random integer between min and max
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Box-Muller transform for normal distribution
function boxMuller(mean: number = 0, stddev: number = 1): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stddev
}

// Generate age with weighted distribution (peak at 25)
function generateAge(): number {
  const baseAge = Math.round(boxMuller(25, 4.5))
  return Math.max(18, Math.min(38, baseAge))
}

// Generate overall rating with normal distribution centered at 55
function generateOverall(): number {
  // 5% elite players
  if (Math.random() < 0.05) {
    return randomInt(85, 99)
  }
  const overall = Math.round(boxMuller(55, 10))
  return Math.max(30, Math.min(99, overall))
}

// Clamp value between min/max
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// Generate hitter attributes based on position and overall
function generateHitterAttributes(position: Position, overall: number) {
  const variation = 15

  // Use variation as the standard deviation for attribute randomness
  let contact = clamp(Math.round(boxMuller(overall, variation)), 1, 99)
  let power = clamp(Math.round(boxMuller(overall, variation)), 1, 99)
  let speed = clamp(Math.round(boxMuller(overall, variation)), 1, 99)
  let fielding = clamp(Math.round(boxMuller(overall, variation)), 1, 99)
  let arm = clamp(Math.round(boxMuller(overall, variation)), 1, 99)
  let discipline = clamp(Math.round(boxMuller(overall, variation)), 1, 99)  // Strikeout avoidance
  let vision = clamp(Math.round(boxMuller(overall, variation)), 1, 99)      // Batting eye/walks

  // Position tendencies
  switch (position) {
    case 'SS':
    case '2B':
      fielding = clamp(fielding + 8, 1, 99)
      speed = clamp(speed + 5, 1, 99)
      power = clamp(power - 3, 1, 99)
      break
    case 'C':
      arm = clamp(arm + 8, 1, 99)
      fielding = clamp(fielding + 8, 1, 99)
      speed = clamp(speed - 10, 1, 99)
      break
    case '1B':
    case 'DH':
      power = clamp(power + 8, 1, 99)
      speed = clamp(speed - 5, 1, 99)
      fielding = clamp(fielding - 5, 1, 99)
      break
    case 'CF':
      speed = clamp(speed + 10, 1, 99)
      fielding = clamp(fielding + 5, 1, 99)
      break
    case 'RF':
      arm = clamp(arm + 8, 1, 99)
      break
  }

  return { contact, power, speed, fielding, arm, discipline, vision }
}

// Generate pitcher attributes
function generatePitcherAttributes(position: Position, overall: number) {
  let stuff = clamp(Math.round(boxMuller(overall, 8)), 1, 99)
  let control = clamp(Math.round(boxMuller(overall, 8)), 1, 99)
  let stamina = clamp(Math.round(boxMuller(overall, 8)), 1, 99)
  let accuracy = clamp(Math.round(boxMuller(overall, 8)), 1, 99)  // Precision/command

  // Position tendencies
  switch (position) {
    case 'SP':
      stamina = clamp(stamina + 10, 60, 99)
      break
    case 'RP':
      stamina = clamp(stamina - 15, 30, 65)
      stuff = clamp(stuff + 5, 1, 99)
      break
    case 'CL':
      stuff = clamp(stuff + 10, 50, 99)
      stamina = clamp(stamina - 15, 1, 99)
      break
  }

  return { stuff, control, stamina, accuracy }
}

// Calculate overall from attributes
function calculateHitterOverall(attrs: { contact: number; power: number; speed: number; fielding: number; arm: number; discipline: number; vision: number }): number {
  return Math.round(attrs.contact * 0.28 + attrs.power * 0.24 + attrs.speed * 0.18 + attrs.fielding * 0.14 + attrs.arm * 0.09 + attrs.discipline * 0.04 + attrs.vision * 0.03)
}

function calculatePitcherOverall(attrs: { stuff: number; control: number; stamina: number; accuracy: number }): number {
  return Math.round(attrs.stuff * 0.38 + attrs.control * 0.32 + attrs.stamina * 0.23 + attrs.accuracy * 0.07)
}

export function generatePlayerPool(): Player[] {
  const players: Player[] = []

  // helper to create a player for a given position/type
  function createPlayer(position: Position, type: PlayerType): Player {
    const firstName = FIRST_NAMES[randomInt(0, FIRST_NAMES.length - 1)]
    const lastName = LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)]
    const age = generateAge()
    const overallRating = generateOverall() as number

    if (type === 'hitter') {
      const hitterAttrs = generateHitterAttributes(position, overallRating)
      const actualOverall = calculateHitterOverall(hitterAttrs)

      return {
        id: uuidv4(),
        firstName,
        lastName,
        position: position as Position,
        type,
        age,
        overall: actualOverall,
        contact: hitterAttrs.contact,
        power: hitterAttrs.power,
        speed: hitterAttrs.speed,
        fielding: hitterAttrs.fielding,
        arm: hitterAttrs.arm,
        discipline: hitterAttrs.discipline,
        vision: hitterAttrs.vision,
        stuff: null,
        control: null,
        stamina: null,
        accuracy: null,
        stats: null,
      }
    }

    const pitcherAttrs = generatePitcherAttributes(position, overallRating)
    const actualOverall = calculatePitcherOverall(pitcherAttrs)
    return {
      id: uuidv4(),
      firstName,
      lastName,
      position: position as Position,
      type,
      age,
      overall: actualOverall,
      contact: null,
      power: null,
      speed: null,
      fielding: null,
      arm: null,
      discipline: null,
      vision: null,
      stuff: pitcherAttrs.stuff,
      control: pitcherAttrs.control,
      stamina: pitcherAttrs.stamina,
      accuracy: pitcherAttrs.accuracy,
      stats: null,
    }
  }

  POSITION_DISTRIBUTION.forEach(({ position, count, type }) => {
    for (let i = 0; i < count; i++) {
      players.push(createPlayer(position, type))
    }
  })

  // Fill remaining bench/extra hitters if needed and distribute across hitter positions
  const totalPlayers = 420
  const currentCount = players.length
  const benchTarget = Math.max(0, totalPlayers - currentCount)
  if (benchTarget > 0) {
    const hitterPositions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']
    for (let i = 0; i < benchTarget; i++) {
      const pos = hitterPositions[randomInt(0, hitterPositions.length - 1)]
      players.push(createPlayer(pos, 'hitter'))
    }
  }

  return players
}
