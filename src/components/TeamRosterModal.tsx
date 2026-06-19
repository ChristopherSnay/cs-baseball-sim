import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Box,
  TableSortLabel,
  Tooltip,
} from '@mui/material'
import { useState } from 'react'
import { Team, HitterStats, PitcherStats, Player } from '../types'
import { PlayerRatingsModal } from './PlayerRatingsModal'

interface TeamRosterModalProps {
  open: boolean
  team: Team | null
  onClose: () => void
}

export function TeamRosterModal({ open, team, onClose }: TeamRosterModalProps) {
  const [tabValue, setTabValue] = useState(0)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'overall', direction: 'desc' })
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [isRatingsModalOpen, setIsRatingsModalOpen] = useState(false)

  if (!team) return null

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  let hitters = team.roster.filter((p) => p.type === 'hitter')
  let pitchers = team.roster.filter((p) => p.type === 'pitcher')

  // Sort hitters
  hitters.sort((a, b) => {
    let aVal: any
    let bVal: any

    if (sortConfig.key === 'name') {
      aVal = `${a.firstName} ${a.lastName}`
      bVal = `${b.firstName} ${b.lastName}`
    } else if (sortConfig.key === 'overall') {
      aVal = a.overall
      bVal = b.overall
    } else {
      aVal = (a.stats as HitterStats)[sortConfig.key as keyof HitterStats] ?? 0
      bVal = (b.stats as HitterStats)[sortConfig.key as keyof HitterStats] ?? 0
    }

    const comparison = typeof aVal === 'string' || typeof bVal === 'string' ? String(aVal).localeCompare(String(bVal)) : aVal - bVal
    return sortConfig.direction === 'asc' ? comparison : -comparison
  })

  // Sort pitchers
  pitchers.sort((a, b) => {
    let aVal: any
    let bVal: any

    if (sortConfig.key === 'name') {
      aVal = `${a.firstName} ${a.lastName}`
      bVal = `${b.firstName} ${b.lastName}`
    } else if (sortConfig.key === 'overall') {
      aVal = a.overall
      bVal = b.overall
    } else {
      aVal = (a.stats as PitcherStats)[sortConfig.key as keyof PitcherStats] ?? 0
      bVal = (b.stats as PitcherStats)[sortConfig.key as keyof PitcherStats] ?? 0
    }

    const comparison = typeof aVal === 'string' || typeof bVal === 'string' ? String(aVal).localeCompare(String(bVal)) : aVal - bVal
    return sortConfig.direction === 'asc' ? comparison : -comparison
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {team.city} {team.nickname} — Season Roster
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab label={`Hitters (${hitters.length})`} />
            <Tab label={`Pitchers (${pitchers.length})`} />
          </Tabs>

          {/* Hitters */}
          {tabValue === 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.light' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Sort by player name">
                        <TableSortLabel active={sortConfig.key === 'name'} direction={sortConfig.direction} onClick={() => handleSort('name')}>
                          Player
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Overall rating">
                        <TableSortLabel active={sortConfig.key === 'overall'} direction={sortConfig.direction} onClick={() => handleSort('overall')}>
                          OVR
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="At bats">
                        <TableSortLabel active={sortConfig.key === 'AB'} direction={sortConfig.direction} onClick={() => handleSort('AB')}>
                          AB
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Batting average">
                        <TableSortLabel active={sortConfig.key === 'AVG'} direction={sortConfig.direction} onClick={() => handleSort('AVG')}>
                          AVG
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Home runs">
                        <TableSortLabel active={sortConfig.key === 'HR'} direction={sortConfig.direction} onClick={() => handleSort('HR')}>
                          HR
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Runs batted in">
                        <TableSortLabel active={sortConfig.key === 'RBI'} direction={sortConfig.direction} onClick={() => handleSort('RBI')}>
                          RBI
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Runs">
                        <TableSortLabel active={sortConfig.key === 'R'} direction={sortConfig.direction} onClick={() => handleSort('R')}>
                          R
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="On-base percentage">
                        <TableSortLabel active={sortConfig.key === 'OBP'} direction={sortConfig.direction} onClick={() => handleSort('OBP')}>
                          OBP
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Slugging percentage">
                        <TableSortLabel active={sortConfig.key === 'SLG'} direction={sortConfig.direction} onClick={() => handleSort('SLG')}>
                          SLG
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="On-base plus slugging">
                        <TableSortLabel active={sortConfig.key === 'OPS'} direction={sortConfig.direction} onClick={() => handleSort('OPS')}>
                          OPS
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hitters.map((player) => {
                    const stats = player.stats as HitterStats | null
                    return (
                      <TableRow key={player.id}>
                        <TableCell
                          onClick={() => {
                            setSelectedPlayer(player)
                            setIsRatingsModalOpen(true)
                          }}
                          sx={{
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            color: 'primary.main',
                            textDecoration: 'underline',
                            '&:hover': { fontWeight: 'bold' },
                          }}
                        >
                          {player.firstName} {player.lastName} ({player.position})
                        </TableCell>
                        <TableCell align="right">{player.overall}</TableCell>
                        <TableCell align="right">{stats?.AB ?? '-'}</TableCell>
                        <TableCell align="right">{stats?.AVG ?? '-'}</TableCell>
                        <TableCell align="right">{stats?.HR ?? '-'}</TableCell>
                        <TableCell align="right">{stats?.RBI ?? '-'}</TableCell>
                        <TableCell align="right">{stats?.R ?? '-'}</TableCell>
                        <TableCell align="right">{stats?.OBP ?? '-'}</TableCell>
                        <TableCell align="right">{stats?.SLG ?? '-'}</TableCell>
                        <TableCell align="right">{stats?.OPS ?? '-'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pitchers */}
          {tabValue === 1 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.light' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Sort by player name">
                        <TableSortLabel active={sortConfig.key === 'name'} direction={sortConfig.direction} onClick={() => handleSort('name')}>
                          Player
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', width: 60 }}>
                      <Tooltip title="Pitcher position (SP = starter, RP = reliever, CL = closer)">
                        <span>Pos</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Overall rating">
                        <TableSortLabel active={sortConfig.key === 'overall'} direction={sortConfig.direction} onClick={() => handleSort('overall')}>
                          OVR
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Wins">
                        <TableSortLabel active={sortConfig.key === 'W'} direction={sortConfig.direction} onClick={() => handleSort('W')}>
                          W
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Losses">
                        <TableSortLabel active={sortConfig.key === 'L'} direction={sortConfig.direction} onClick={() => handleSort('L')}>
                          L
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Earned run average">
                        <TableSortLabel active={sortConfig.key === 'ERA'} direction={sortConfig.direction} onClick={() => handleSort('ERA')}>
                          ERA
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Innings pitched">
                        <TableSortLabel active={sortConfig.key === 'IP'} direction={sortConfig.direction} onClick={() => handleSort('IP')}>
                          IP
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Strikeouts">
                        <TableSortLabel active={sortConfig.key === 'SO'} direction={sortConfig.direction} onClick={() => handleSort('SO')}>
                          SO
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Walks and hits per innings pitched">
                        <TableSortLabel active={sortConfig.key === 'WHIP'} direction={sortConfig.direction} onClick={() => handleSort('WHIP')}>
                          WHIP
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      <Tooltip title="Saves">
                        <TableSortLabel active={sortConfig.key === 'SV'} direction={sortConfig.direction} onClick={() => handleSort('SV')}>
                          SV
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pitchers.map((player) => {
                    const stats = player.stats as PitcherStats | null
                    return (
                      <TableRow key={player.id}>
                        <TableCell
                          onClick={() => {
                            setSelectedPlayer(player)
                            setIsRatingsModalOpen(true)
                          }}
                          sx={{
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            color: 'primary.main',
                            textDecoration: 'underline',
                            '&:hover': { fontWeight: 'bold' },
                          }}
                        >
                          {player.firstName} {player.lastName}
                        </TableCell>
                        <TableCell align="right">{player.position}</TableCell>
                        <TableCell align="right">{player.overall}</TableCell>
                        <TableCell align="right">{stats?.W ?? '-'}</TableCell>
                        <TableCell align="right">{stats?.L ?? '-'}</TableCell>
                        <TableCell align="right">{stats?.ERA ?? '-'}</TableCell>
                        <TableCell align="right">{stats ? stats.IP.toFixed(1) : '-'}</TableCell>
                        <TableCell align="right">{stats?.SO ?? '-'}</TableCell>
                        <TableCell align="right">{stats?.WHIP ?? '-'}</TableCell>
                        <TableCell align="right">{stats?.SV ?? '-'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      <PlayerRatingsModal open={isRatingsModalOpen} player={selectedPlayer} onClose={() => setIsRatingsModalOpen(false)} />
    </Dialog>
  )
}
