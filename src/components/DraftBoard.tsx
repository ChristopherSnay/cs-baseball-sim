import { useMemo, useState } from 'react'
import { Box, Typography, Chip, Stack, Paper } from '@mui/material'
import { useGame } from '../context/GameContext'
import { getBenchCount, getRequiredPositions } from '../utils/draftEngine'
import { PlayerRatingsModal } from './PlayerRatingsModal'
import { Player } from '../types'

interface DraftBoardProps {
  currentPickIndex: number
  onPickCount?: number
}

interface PositionStatusChip {
  position: string
  filled: number
  required: number
  complete: boolean
}

export function DraftBoard({ currentPickIndex, onPickCount = 5 }: DraftBoardProps) {
  const { teams, draftOrder, userPickNumber } = useGame()
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])
  const userTeam = useMemo(() => teams.find((team) => team.isUserTeam), [teams])
  const positionStatus = useMemo(() => {
    const roster = userTeam?.roster ?? []
    const requiredPositions = getRequiredPositions()
    const benchCount = getBenchCount()

    const statuses: PositionStatusChip[] = requiredPositions.map((required) => {
      const filled = roster.filter((player) => player.position === required.position).length
      return {
        position: required.position,
        filled,
        required: required.count,
        complete: filled >= required.count,
      }
    })

    const hitterCount = roster.filter((player) => player.type === 'hitter').length
    const fixedHitterSlots = requiredPositions.filter((required) => required.position !== 'SP' && required.position !== 'RP' && required.position !== 'CL').length

    const benchFilled = Math.max(0, hitterCount - fixedHitterSlots)

    statuses.push({
      position: 'Bench',
      filled: Math.min(benchFilled, benchCount),
      required: benchCount,
      complete: benchFilled >= benchCount,
    })

    return statuses
  }, [userTeam])

  // Get recent picks (last 20) and upcoming picks (next 5)
  const recentStartIdx = Math.max(0, currentPickIndex - 20)
  const recentPicks = draftOrder.slice(recentStartIdx, currentPickIndex)
  const upcomingPicks = draftOrder.slice(currentPickIndex, currentPickIndex + onPickCount)
  // Current pick info
  const currentPick = draftOrder[currentPickIndex]
  const currentRound = currentPick?.round || 1
  const currentPickNum = currentPick?.pickNumber || 1

  // Build unified rows array so headers can sort
  const buildRows = () => {
    const rows: Array<any> = []
    recentPicks.forEach((pick, idx) => {
      const team = teamMap.get(pick.teamId)
      const player = team?.roster[team.roster.length - 1]
      rows.push({
        type: 'recent',
        idx: recentStartIdx + idx,
        round: pick.round,
        pickNumber: pick.pickNumber,
        team: team?.city || '-',
        playerName: player ? `${player.firstName} ${player.lastName}` : '-',
        playerObject: player || null,
        pos: player?.position || '-',
        ovr: player?.overall ?? '-',
      })
    })

    if (currentPick) {
      const team = teamMap.get(currentPick.teamId)
      rows.push({
        type: 'current',
        idx: currentPickIndex,
        round: currentPick.round,
        pickNumber: currentPick.pickNumber,
        team: team?.city || '-',
        playerName: 'On The Clock...',
        playerObject: null,
        pos: '-',
        ovr: '-',
      })
    }

    upcomingPicks.forEach((pick, i) => {
      const team = teamMap.get(pick.teamId)
      rows.push({
        type: 'upcoming',
        idx: currentPickIndex + i,
        round: pick.round,
        pickNumber: pick.pickNumber,
        team: team?.city || '-',
        playerName: '-',
        playerObject: null,
        pos: '-',
        ovr: '-',
      })
    })

    return rows
  }

  const rows = buildRows()


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', p: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
      {/* Sticky header */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6">
          Round {currentRound}, Pick {currentPickNum}
        </Typography>
        <Typography variant="body2">You are picking #{userPickNumber}</Typography>
      </Paper>

      {/* Your drafted positions */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
        Position Progress
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
        {positionStatus.length === 0 ? (
          <Chip label="None yet" size="small" variant="outlined" />
        ) : (
          positionStatus.map(({ position, filled, required, complete }) => (
            <Chip
              key={position}
              label={`${position} ${filled}/${required}`}
              size="small"
              color={filled > required ? 'info' : complete ? 'success' : filled > 0 ? 'warning' : 'default'}
              variant={filled > required || complete || filled > 0 ? 'filled' : 'outlined'}
              sx={{ fontWeight: filled > required || complete || filled > 0 ? 700 : 400 }}
            />
          ))
        )}
      </Stack>

      {/* Team roster counts */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
        Team Roster Counts
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5, maxHeight: '100px', overflowY: 'auto' }}>
        {teams.map((team) => (
          <Chip
            key={team.id}
            label={`${team.city.substring(0, 3)}: ${team.roster.length}`}
            size="small"
            variant={team.id === draftOrder[currentPickIndex]?.teamId ? 'filled' : 'outlined'}
            color={team.isUserTeam ? 'primary' : 'default'}
          />
        ))}
      </Stack>

      {/* Recent and upcoming picks list */}
      <Typography variant='subtitle2' sx={{ mb: 1, fontWeight: 'bold' }}>
        Draft History & Upcoming
      </Typography>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', bgcolor: 'rgba(255, 255, 255, 0.02)', borderRadius: 1 }}>
        <Stack spacing={0.5} sx={{ p: 1 }}>
          {rows.map((row) => {
            const isCurrent = row.type === 'current'
            const rowKey = `row-${row.type}-${row.pickNumber}-${row.idx}`
            const pickLabel = `R${row.round}.${row.pickNumber}`

            return (
              <Box
                key={rowKey}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 35px',
                  gap: 1.5,
                  p: 1,
                  borderRadius: 0.5,
                  bgcolor: isCurrent ? 'primary.main' : 'transparent',
                  color: isCurrent ? 'white' : 'inherit',
                  opacity: row.type === 'recent' ? 0.8 : row.type === 'upcoming' ? 0.6 : 1,
                  transition: 'all 0.2s',
                  alignItems: 'center',
                  '&:hover': {
                    bgcolor: isCurrent ? 'primary.dark' : 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                {/* Pick number - left column */}
                <Typography variant='body2' sx={{ fontWeight: 'bold', color: isCurrent ? 'white' : 'primary.main' }}>
                  {pickLabel}
                </Typography>

                {/* Team and Player - middle column */}
                <Stack spacing={0.25}>
                  <Typography variant='body2' sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    {row.team}
                  </Typography>
                  <Box
                    onClick={() => {
                      if (row.playerObject) {
                        setSelectedPlayer(row.playerObject)
                        setIsModalOpen(true)
                      }
                    }}
                    sx={{
                      cursor: row.playerObject ? 'pointer' : 'default',
                      color: isCurrent ? 'white' : row.playerObject ? 'primary.main' : 'text.secondary',
                      textDecoration: row.playerObject ? 'underline' : 'none',
                      '&:hover': row.playerObject ? { fontWeight: 'bold' } : {},
                    }}
                  >
                    <Typography variant='body2'>{row.playerName}</Typography>
                  </Box>
                </Stack>

                {/* Position and Overall - right column */}
                {row.pos !== '-' && (
                  <Stack spacing={0.25} sx={{ textAlign: 'right' }}>
                    <Typography variant='caption' sx={{ fontSize: '0.75rem' }}>{row.pos}</Typography>
                    <Typography variant='caption' sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{row.ovr}</Typography>
                  </Stack>
                )}
              </Box>
            )
          })}
        </Stack>
      </Box>

      <PlayerRatingsModal open={isModalOpen} player={selectedPlayer} onClose={() => setIsModalOpen(false)} />
    </Box>
  )
}
