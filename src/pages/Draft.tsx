import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Grid, AlertTitle, Alert, CircularProgress } from '@mui/material'
import { useGame } from '../context/GameContext'
import { DraftBoard } from '../components/DraftBoard'
import { PlayerPickerTable } from '../components/PlayerPickerTable'
import { selectBestPlayer } from '../utils/draftEngine'

export function Draft() {
  const navigate = useNavigate()
  const { teams, draftOrder, currentPickIndex, userTeamId, availablePlayers, draftPlayer, advancePick } = useGame()
  const [isProcessing, setIsProcessing] = useState(false)

  const currentPick = draftOrder[currentPickIndex]
  const isUserTurn = currentPick?.teamId === userTeamId

  // Auto-advance through CPU picks
  useEffect(() => {
    if (!currentPick) {
      // Draft complete, navigate to season
      navigate('/season')
      return
    }

    if (isUserTurn) {
      setIsProcessing(false)
    } else {
      // CPU turn
      setIsProcessing(true)
      const timer = setTimeout(() => {
        const team = teams.find((t) => t.id === currentPick.teamId)
        if (team) {
          const selectedPlayer = selectBestPlayer(team, availablePlayers)
          if (selectedPlayer) {
            draftPlayer(selectedPlayer.id, currentPick.teamId)
          }
        }
        advancePick()
        setIsProcessing(false)
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [currentPickIndex, isUserTurn, teams, availablePlayers])

  if (!currentPick) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  const handlePlayerDraft = (playerId: string) => {
    draftPlayer(playerId, userTeamId)
    advancePick()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', p: 2 }}>
      {/* User pick banner */}
      {isUserTurn && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>YOUR PICK</AlertTitle>
          Round {currentPick.round}, Pick {currentPick.pickNumber} — Select a player to draft
        </Alert>
      )}

      {/* Main draft grid */}
      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
        {/* Left: Draft Board */}
        <Grid item xs={12} md={3} sx={{ minHeight: 0, height: '100%', display: 'flex' }}>
          <Box sx={{ width: '100%', minHeight: 0, height: '100%', minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <DraftBoard currentPickIndex={currentPickIndex} />
          </Box>
        </Grid>

        {/* Right: Player Picker */}
        <Grid item xs={12} md={9} sx={{ minHeight: 0, height: '100%', display: 'flex' }}>
          <Box sx={{ width: '100%', minHeight: 0, height: '100%', minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            <PlayerPickerTable availablePlayers={availablePlayers} isUserTurn={isUserTurn} userTeamId={userTeamId} onDraftPlayer={handlePlayerDraft} />
            {isProcessing && (
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0, 0, 0, 0.3)', borderRadius: 1, zIndex: 10 }}>
                <CircularProgress />
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
