import { generatePlayerPool } from '../src/utils/playerGenerator'
import { buildSnakeDraftOrder, selectBestPlayer } from '../src/utils/draftEngine'
import { generateSchedule } from '../src/utils/scheduleGenerator'
import { simulateAllGames } from '../src/utils/simulationEngine'
import { Team, Player, HitterStats, PitcherStats } from '../src/types'

function initializeTeams(teamIds: string[]): Team[] {
  return teamIds.map((id, idx) => ({
    id,
    city: ['Boston', 'New York', 'Chicago', 'Los Angeles', 'Houston', 'Atlanta', 'Philadelphia', 'San Diego', 'San Francisco', 'Detroit', 'Toronto', 'Miami'][idx],
    nickname: ['Red Sox', 'Yankees', 'Cubs', 'Dodgers', 'Astros', 'Braves', 'Phillies', 'Padres', 'Giants', 'Tigers', 'Blue Jays', 'Marlins'][idx],
    logo: '',
    roster: [],
    wins: 0,
    losses: 0,
    isUserTeam: idx === 0,
  }))
}

function runDraft(teams: Team[], playerPool: Player[], draftOrder: any[]): Team[] {
  const updatedTeams = JSON.parse(JSON.stringify(teams)) as Team[]
  let availablePlayers = [...playerPool]

  draftOrder.forEach((pick) => {
    const team = updatedTeams.find((t) => t.id === pick.teamId)
    if (team && availablePlayers.length > 0) {
      const selectedPlayer = selectBestPlayer(team, availablePlayers)
      if (selectedPlayer) {
        team.roster.push(selectedPlayer)
        availablePlayers = availablePlayers.filter((p) => p.id !== selectedPlayer.id)
      }
    }
  })

  return updatedTeams
}

function runSeasonSimulation() {
  console.log('🏏 STARTING FULL SEASON SIMULATION...\n')
  
  // Setup
  const numTeams = 12
  const teamIds = Array.from({ length: numTeams }, (_, i) => `team-${i}`)
  
  console.log('📊 Generating 1000+ players...')
  const players = generatePlayerPool()
  console.log(`✓ Generated ${players.length} players\n`)
  
  // Initialize teams
  console.log('🏟️  Initializing teams...')
  let teams = initializeTeams(teamIds)
  console.log(`✓ Created ${teams.length} teams\n`)
  
  // Build and execute draft
  console.log('📋 Running draft (20 rounds)...')
  const draftOrder = buildSnakeDraftOrder(teamIds)
  teams = runDraft(teams, players, draftOrder)
  console.log(`✓ Draft complete - all teams have ${teams[0].roster.length} players\n`)
  
  // Build schedule and simulate season
  console.log('⚾ Simulating 162-game season...')
  const schedule = generateSchedule(teams)
  teams = simulateAllGames(teams, schedule)
  console.log(`✓ Season simulation complete!\n`)
  
  // Final standings
  console.log('\n═══════════════════════════════════════')
  console.log('          FINAL STANDINGS')
  console.log('═══════════════════════════════════════\n')
  
  const standings = teams
    .sort((a, b) => b.wins - a.wins)
    .map((team, idx) => ({
      Rank: idx + 1,
      Team: `${team.city} ${team.nickname}`,
      W: team.wins,
      L: team.losses,
      'W-L %': ((team.wins / (team.wins + team.losses)) * 1000 | 0) / 1000
    }))
  
  console.table(standings)
  
  // Batting leaders
  console.log('\n═══════════════════════════════════════')
  console.log('       BATTING LEADERS (Top 15 AVG)')
  console.log('═══════════════════════════════════════\n')
  
  const hitters = teams
    .flatMap(team =>
      team.roster
        .filter(p => p.type === 'hitter')
        .map(p => {
          const stats = p.stats as HitterStats
          return {
            Player: `${p.firstName} ${p.lastName}`,
            Team: team.city,
            G: stats?.G || 0,
            AB: stats?.AB || 0,
            H: stats?.H || 0,
            HR: stats?.HR || 0,
            RBI: stats?.RBI || 0,
            SB: stats?.SB || 0,
            AVG: stats?.AVG || '.000',
            OBP: stats?.OBP || '.000',
            OPS: stats?.OPS || '.000'
          }
        })
    )
    .filter(h => h.AB > 0)
    .sort((a, b) => parseFloat(b.AVG) - parseFloat(a.AVG))
    .slice(0, 15)
  
  console.table(hitters)
  
  // Pitching leaders - Strikeouts
  console.log('\n═══════════════════════════════════════')
  console.log('    PITCHING LEADERS (Top 15 SO)')
  console.log('═══════════════════════════════════════\n')
  
  const pitchers = teams
    .flatMap(team =>
      team.roster
        .filter(p => p.type === 'pitcher')
        .map(p => {
          const stats = p.stats as PitcherStats
          return {
            Player: `${p.firstName} ${p.lastName}`,
            Team: team.city,
            Pos: p.position,
            G: stats?.G || 0,
            GS: stats?.GS || 0,
            W: stats?.W || 0,
            L: stats?.L || 0,
            SV: stats?.SV || 0,
            IP: (stats?.IP || 0).toFixed(1),
            SO: stats?.SO || 0,
            ERA: stats?.ERA || '0.00',
            WHIP: stats?.WHIP || '0.00'
          }
        })
    )
    .filter(p => parseFloat(p.IP) > 0)
    .sort((a, b) => b.SO - a.SO)
    .slice(0, 15)
  
  console.table(pitchers)
  
  // Stat leaders - one per category
  console.log('\n═══════════════════════════════════════')
  console.log('         STATISTICAL LEADERS')
  console.log('═══════════════════════════════════════\n')
  
  // Get all hitters for stats
  const allHitters = teams
    .flatMap(team =>
      team.roster
        .filter(p => p.type === 'hitter')
        .map(p => {
          const stats = p.stats as HitterStats
          return {
            Player: `${p.firstName} ${p.lastName}`,
            Team: team.city,
            G: stats?.G || 0,
            AB: stats?.AB || 0,
            H: stats?.H || 0,
            HR: stats?.HR || 0,
            RBI: stats?.RBI || 0,
            SB: stats?.SB || 0,
            AVG: parseFloat(stats?.AVG || '0'),
            OBP: parseFloat(stats?.OBP || '0'),
            OPS: parseFloat(stats?.OPS || '0')
          }
        })
    )
    .filter(h => h.AB > 0)
  
  const allPitchers = teams
    .flatMap(team =>
      team.roster
        .filter(p => p.type === 'pitcher')
        .map(p => {
          const stats = p.stats as PitcherStats
          return {
            Player: `${p.firstName} ${p.lastName}`,
            Team: team.city,
            Pos: p.position,
            G: stats?.G || 0,
            GS: stats?.GS || 0,
            W: stats?.W || 0,
            L: stats?.L || 0,
            SV: stats?.SV || 0,
            IP: stats?.IP || 0,
            SO: stats?.SO || 0,
            ERA: parseFloat(stats?.ERA || '999'),
            WHIP: parseFloat(stats?.WHIP || '999')
          }
        })
    )
    .filter(p => p.IP > 0)
  
  // Create batting leaders table
  const battingLeaders = [
    { Stat: 'Games (G)', 
      Leader: allHitters.sort((a, b) => b.G - a.G)[0],
      statValue: allHitters.sort((a, b) => b.G - a.G)[0]?.G || 0 },
    { Stat: 'At-Bats (AB)', 
      Leader: allHitters.sort((a, b) => b.AB - a.AB)[0],
      statValue: allHitters.sort((a, b) => b.AB - a.AB)[0]?.AB || 0 },
    { Stat: 'Hits (H)', 
      Leader: allHitters.sort((a, b) => b.H - a.H)[0],
      statValue: allHitters.sort((a, b) => b.H - a.H)[0]?.H || 0 },
    { Stat: 'Home Runs (HR)', 
      Leader: allHitters.sort((a, b) => b.HR - a.HR)[0],
      statValue: allHitters.sort((a, b) => b.HR - a.HR)[0]?.HR || 0 },
    { Stat: 'RBIs', 
      Leader: allHitters.sort((a, b) => b.RBI - a.RBI)[0],
      statValue: allHitters.sort((a, b) => b.RBI - a.RBI)[0]?.RBI || 0 },
    { Stat: 'Stolen Bases (SB)', 
      Leader: allHitters.sort((a, b) => b.SB - a.SB)[0],
      statValue: allHitters.sort((a, b) => b.SB - a.SB)[0]?.SB || 0 },
    { Stat: 'Batting Avg (AVG)', 
      Leader: allHitters.sort((a, b) => b.AVG - a.AVG)[0],
      statValue: allHitters.sort((a, b) => b.AVG - a.AVG)[0]?.AVG.toFixed(3) || '.000' },
    { Stat: 'On-Base Pct (OBP)', 
      Leader: allHitters.sort((a, b) => b.OBP - a.OBP)[0],
      statValue: allHitters.sort((a, b) => b.OBP - a.OBP)[0]?.OBP.toFixed(3) || '.000' },
    { Stat: 'On-Base Plus Slug (OPS)', 
      Leader: allHitters.sort((a, b) => b.OPS - a.OPS)[0],
      statValue: allHitters.sort((a, b) => b.OPS - a.OPS)[0]?.OPS.toFixed(3) || '.000' }
  ]
  
  const battingLeadersTable = battingLeaders.map(item => ({
    Stat: item.Stat,
    'Stat Value': item.statValue,
    Player: item.Leader?.Player || 'N/A',
    Team: item.Leader?.Team || 'N/A',
    G: item.Leader?.G || 0,
    AB: item.Leader?.AB || 0,
    H: item.Leader?.H || 0,
    HR: item.Leader?.HR || 0,
    RBI: item.Leader?.RBI || 0,
    SB: item.Leader?.SB || 0,
    AVG: item.Leader?.AVG.toFixed(3) || '.000',
    OBP: item.Leader?.OBP.toFixed(3) || '.000',
    OPS: item.Leader?.OPS.toFixed(3) || '.000'
  }))
  
  console.log('BATTING LEADERS BY STAT:')
  console.table(battingLeadersTable)
  
  // Create pitching leaders table
  const pitchingLeaders = [
    { Stat: 'Games (G)', 
      Leader: allPitchers.sort((a, b) => b.G - a.G)[0],
      statValue: allPitchers.sort((a, b) => b.G - a.G)[0]?.G || 0 },
    { Stat: 'Games Started (GS)', 
      Leader: allPitchers.sort((a, b) => b.GS - a.GS)[0],
      statValue: allPitchers.sort((a, b) => b.GS - a.GS)[0]?.GS || 0 },
    { Stat: 'Wins (W)', 
      Leader: allPitchers.sort((a, b) => b.W - a.W)[0],
      statValue: allPitchers.sort((a, b) => b.W - a.W)[0]?.W || 0 },
    { Stat: 'Losses (L)', 
      Leader: allPitchers.sort((a, b) => b.L - a.L)[0],
      statValue: allPitchers.sort((a, b) => b.L - a.L)[0]?.L || 0 },
    { Stat: 'Saves (SV)', 
      Leader: allPitchers.sort((a, b) => b.SV - a.SV)[0],
      statValue: allPitchers.sort((a, b) => b.SV - a.SV)[0]?.SV || 0 },
    { Stat: 'Innings Pitched (IP)', 
      Leader: allPitchers.sort((a, b) => b.IP - a.IP)[0],
      statValue: allPitchers.sort((a, b) => b.IP - a.IP)[0]?.IP.toFixed(1) || '0.0' },
    { Stat: 'Strikeouts (SO)', 
      Leader: allPitchers.sort((a, b) => b.SO - a.SO)[0],
      statValue: allPitchers.sort((a, b) => b.SO - a.SO)[0]?.SO || 0 },
    { Stat: 'ERA', 
      Leader: allPitchers.sort((a, b) => a.ERA - b.ERA)[0],
      statValue: allPitchers.sort((a, b) => a.ERA - b.ERA)[0]?.ERA.toFixed(2) || '0.00' },
    { Stat: 'WHIP', 
      Leader: allPitchers.sort((a, b) => a.WHIP - b.WHIP)[0],
      statValue: allPitchers.sort((a, b) => a.WHIP - b.WHIP)[0]?.WHIP.toFixed(2) || '0.00' }
  ]
  
  const pitchingLeadersTable = pitchingLeaders.map(item => ({
    Stat: item.Stat,
    'Stat Value': item.statValue,
    Player: item.Leader?.Player || 'N/A',
    Team: item.Leader?.Team || 'N/A',
    Pos: item.Leader?.Pos || 'N/A',
    G: item.Leader?.G || 0,
    GS: item.Leader?.GS || 0,
    W: item.Leader?.W || 0,
    L: item.Leader?.L || 0,
    SV: item.Leader?.SV || 0,
    IP: item.Leader?.IP.toFixed(1) || '0.0',
    SO: item.Leader?.SO || 0,
    ERA: item.Leader?.ERA.toFixed(2) || '0.00',
    WHIP: item.Leader?.WHIP.toFixed(2) || '0.00'
  }))
  
  console.log('\nPITCHING LEADERS BY STAT:')
  console.table(pitchingLeadersTable)
  
  // Statistics summary
  console.log('\n═══════════════════════════════════════')
  console.log('         SIMULATION STATISTICS')
  console.log('═══════════════════════════════════════\n')
  
  const topHitter = hitters[0]
  const topPitcher = pitchers[0]
  const avgBattingAvg = (
    teams
      .flatMap(t => t.roster.filter(p => p.type === 'hitter'))
      .reduce((sum, p) => sum + parseFloat((p.stats as HitterStats)?.AVG || '0'), 0) /
    teams.flatMap(t => t.roster.filter(p => p.type === 'hitter')).length
  ).toFixed(3)
  
  console.log(`Top Batting Average: ${topHitter.AVG} (${topHitter.Player})`)
  console.log(`League Batting Average: .${avgBattingAvg}`)
  console.log(`Top Strikeout Pitcher: ${topPitcher.SO} SO (${topPitcher.Player})`)
  console.log(`Top ERA Pitcher: ${pitchers.sort((a, b) => parseFloat(a.ERA) - parseFloat(b.ERA))[0].ERA} (${pitchers.sort((a, b) => parseFloat(a.ERA) - parseFloat(b.ERA))[0].Player})`)
}

runSeasonSimulation()
