import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Container, Button, Typography, Dialog, TextField, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { useGame } from '../context/GameContext'
import { TEAM_NAMES } from '../data/seeds'
import { generatePlayerPool } from '../utils/playerGenerator'
import { buildSnakeDraftOrder } from '../utils/draftEngine'
import { Team } from '../types'

export function Home() {
  const navigate = useNavigate()
  const { initGame } = useGame()
  const [teamNameDialogOpen, setTeamNameDialogOpen] = useState(false)
  const [userTeamName, setUserTeamName] = useState('')

  const handleGenerateTeams = () => {
    setTeamNameDialogOpen(true)
  }

  const handleConfirmTeamName = () => {
    if (!userTeamName.trim()) return

    // Parse team name (expecting "City Nickname" format)
    const parts = userTeamName.split(' ')
    const nickname = parts[parts.length - 1]
    const city = parts.slice(0, -1).join(' ') || 'Detroit'

    // Generate 20 CPU teams
    const shuffled = [...TEAM_NAMES].sort(() => Math.random() - 0.5)
    const cpuTeams: Team[] = shuffled.slice(0, 20).map((teamName, idx) => ({
      id: `team-${idx}`,
      city: teamName.city,
      nickname: teamName.nickname,
      isUserTeam: false,
      roster: [],
      wins: 0,
      losses: 0,
    }))

    // Create user team
    const userTeam: Team = {
      id: 'user-team',
      city,
      nickname,
      isUserTeam: true,
      roster: [],
      wins: 0,
      losses: 0,
    }

    const userPickNumber = Math.floor(Math.random() * 21) + 1

    // Place user team at the randomized pick position among team ids
    const cpuIds = cpuTeams.map((t) => t.id)
    const teamIds = [...cpuIds]
    const insertIndex = Math.max(0, Math.min(cpuIds.length, userPickNumber - 1))
    teamIds.splice(insertIndex, 0, userTeam.id)

    const allTeams = [...cpuTeams, userTeam]

    // Generate player pool
    const playerPool = generatePlayerPool()

    // Build draft order with user at assigned spot
    const draftOrder = buildSnakeDraftOrder(teamIds)

    // Initialize game context
    initGame(allTeams, playerPool, userTeam.id, userPickNumber, draftOrder)

    // Navigate to draft
    navigate('/draft')

    setTeamNameDialogOpen(false)
    setUserTeamName('')
  }

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 0 }}>
      <Card sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper' }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          ⚾ Diamond Sim
        </Typography>
        <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary', mb: 4 }}>
          Build your roster. Win the pennant.
        </Typography>
        <Button variant="contained" size="large" onClick={handleGenerateTeams} sx={{ textTransform: 'none', fontSize: '1rem' }}>
          Generate Teams & Start
        </Button>
      </Card>

      <Dialog open={teamNameDialogOpen} onClose={() => setTeamNameDialogOpen(false)}>
        <DialogTitle>Name Your Team</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth placeholder="My City Legends" value={userTeamName} onChange={(e) => setUserTeamName(e.target.value)} margin="dense" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamNameDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmTeamName} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
