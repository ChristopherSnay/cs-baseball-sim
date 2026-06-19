import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Container, Tabs, Tab, Button, Alert, AlertTitle, CircularProgress, Typography } from '@mui/material'
import { useGame } from '../context/GameContext'
import { StandingsTable } from '../components/StandingsTable'
import { StatsLeaderboard } from '../components/StatsLeaderboard'
import { generateSchedule } from '../utils/scheduleGenerator'
import { simulateAllGames } from '../utils/simulationEngine'

export function Season() {
  const navigate = useNavigate()
  const { teams, seasonSimulated, simulateSeason, resetGame } = useGame()
  const [tabValue, setTabValue] = useState(0)
  const [isSimulating, setIsSimulating] = useState(false)
  const [hasSimulated, setHasSimulated] = useState(seasonSimulated)

  const userTeam = teams.find((t) => t.isUserTeam)

  // Simulate season on mount if not already done
  useEffect(() => {
    if (!hasSimulated && teams.length > 0) {
      setIsSimulating(true)
      
      // Generate schedule
      const generatedSchedule = generateSchedule(teams)
      
      // Simulate all games
      const updatedTeams = simulateAllGames(teams, generatedSchedule)
      
      // Update context
      simulateSeason(generatedSchedule, updatedTeams)
      
      setHasSimulated(true)
      setIsSimulating(false)
    }
  }, [teams])

  if (isSimulating) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 0, gap: 2 }}>
        <CircularProgress />
        <Typography>Simulating 162-game season...</Typography>
      </Box>
    )
  }

  if (!userTeam || teams.length === 0) {
    return (
      <Container>
        <Alert severity="error">
          <AlertTitle>Game State Error</AlertTitle>
          No teams found. Please start a new game.
        </Alert>
        <Button onClick={() => navigate('/')} variant="contained" sx={{ mt: 2 }}>
          Back to Home
        </Button>
      </Container>
    )
  }

  // Determine user placement
  const sortedTeams = [...teams].sort((a, b) => {
    const aWinPct = a.wins / (a.wins + a.losses)
    const bWinPct = b.wins / (b.wins + b.losses)
    return bWinPct - aWinPct
  })
  const userRank = sortedTeams.findIndex((t) => t.id === userTeam.id) + 1
  const wonPennant = userRank === 1

  return (
    <Container maxWidth="lg" sx={{ py: 2, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Result banner */}
      <Alert severity={wonPennant ? 'success' : 'info'} sx={{ mb: 3 }} icon={wonPennant ? '🏆' : undefined}>
        <AlertTitle>{wonPennant ? '🏆 Pennant Winner!' : `Finished ${userRank}${userRank === 2 ? 'nd' : userRank === 3 ? 'rd' : 'th'} Place`}</AlertTitle>
        {userTeam.city} {userTeam.nickname}: {userTeam.wins} wins, {userTeam.losses} losses
      </Alert>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ '& .MuiTab-root': { color: 'white' } }}>
          <Tab label="Standings" />
          <Tab label="Stats Leaders" />
        </Tabs>
      </Box>

      {/* Standings */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {tabValue === 0 && <StandingsTable teams={teams} />}

        {/* Stats Leaders */}
        {tabValue === 1 && <StatsLeaderboard />}
      </Box>

      {/* Play Again Button */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => {
            resetGame()
            navigate('/')
          }}
        >
          Play Again
        </Button>
      </Box>
    </Container>
  )
}
