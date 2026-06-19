import { Team, GameResult } from '../types'

export function generateSchedule(teams: Team[]): GameResult[] {
  const schedule: GameResult[] = []
  const numTeams = teams.length
  const gamesPerTeam = 162

  // Create a mapping of games per team
  const gamesPerTeamMap: { [teamId: string]: GameResult[] } = {}
  teams.forEach((team) => {
    gamesPerTeamMap[team.id] = []
  })

  // Generate round-robin matches with repeats to ensure 162 games per team
  let gameId = 0
  for (let round = 0; round < 15; round++) {
    // 15 rounds to get enough games (12 teams choose 2 = 66 games/round, need ~15 rounds for 162 games/team)
    for (let i = 0; i < numTeams; i++) {
      for (let j = i + 1; j < numTeams; j++) {
        const team1 = teams[i]
        const team2 = teams[j]

        // Alternate home/away
        const isTeam1Home = (round + i) % 2 === 0

        const game: GameResult = {
          homeTeamId: isTeam1Home ? team1.id : team2.id,
          awayTeamId: isTeam1Home ? team2.id : team1.id,
          homeScore: 0,
          awayScore: 0,
        }

        schedule.push(game)
        gamesPerTeamMap[team1.id].push(game)
        gamesPerTeamMap[team2.id].push(game)

        gameId++
      }
    }
  }

  // Trim to exactly 162 games per team
  const finalSchedule: GameResult[] = []
  const gamesToInclude = new Set<GameResult>()

  // Ensure each team has exactly 162 games
  const gamesByTeam: { [teamId: string]: number } = {}
  teams.forEach((team) => {
    gamesByTeam[team.id] = 0
  })

  // Shuffle schedule and pick games
  const shuffledSchedule = [...schedule].sort(() => Math.random() - 0.5)

  for (const game of shuffledSchedule) {
    const homeTeam = game.homeTeamId
    const awayTeam = game.awayTeamId

    if ((gamesByTeam[homeTeam] || 0) < gamesPerTeam && (gamesByTeam[awayTeam] || 0) < gamesPerTeam) {
      finalSchedule.push(game)
      gamesToInclude.add(game)
      gamesByTeam[homeTeam]++
      gamesByTeam[awayTeam]++
    }
  }

  // If any team is short, add more games
  for (const game of schedule) {
    if (gamesToInclude.has(game)) continue

    const homeTeam = game.homeTeamId
    const awayTeam = game.awayTeamId

    if ((gamesByTeam[homeTeam] || 0) < gamesPerTeam && (gamesByTeam[awayTeam] || 0) < gamesPerTeam) {
      finalSchedule.push(game)
      gamesToInclude.add(game)
      gamesByTeam[homeTeam]++
      gamesByTeam[awayTeam]++
    }
  }

  return finalSchedule
}
