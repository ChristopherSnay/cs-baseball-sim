import { useState, useMemo, useEffect } from 'react'
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TextField, Tabs, Tab, Button, Chip, Stack, Typography, Skeleton, TableSortLabel, Tooltip, FormControlLabel, Checkbox } from '@mui/material'
import { useGame } from '../context/GameContext'
import { Player, Position } from '../types'
import { getRequiredPositions, getBenchCount } from '../utils/draftEngine'
import { PlayerRatingsModal } from './PlayerRatingsModal'

interface PlayerPickerTableProps {
  availablePlayers: Player[]
  isUserTurn: boolean
  userTeamId: string
  onDraftPlayer: (playerId: string) => void
}

export function PlayerPickerTable({ availablePlayers, isUserTurn, onDraftPlayer }: PlayerPickerTableProps) {
  const { teams } = useGame()
  const [searchText, setSearchText] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [positionFilter, setPositionFilter] = useState<Position | 'ALL' | 'HITTERS' | 'PITCHERS'>('ALL')
  const [hideSatisfied, setHideSatisfied] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'overall', direction: 'desc' })
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const allPositions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CL']

  const positionCompletion = useMemo(() => {
    const userTeam = teams.find((team) => team.isUserTeam)
    const roster = userTeam?.roster ?? []
    const requiredPositions = getRequiredPositions()
    const fixedMap = new Map(requiredPositions.map((required) => [required.position, required.count]))

    const hitterCount = roster.filter((player) => player.type === 'hitter').length
    const fixedHitterSlots = requiredPositions.filter((required) => required.position !== 'SP' && required.position !== 'RP' && required.position !== 'CL').length

    const benchCount = getBenchCount()
    const benchFilled = Math.max(0, hitterCount - fixedHitterSlots)

    return allPositions.reduce<Record<string, { filled: number; required: number; complete: boolean }>>((accumulator, position) => {
      const required = fixedMap.get(position) ?? 0
      const fixedFilled = roster.filter((player) => player.position === position).length

      // For draft purposes: required positions are C/1B/2B/3B/SS/LF/CF/RF (8 hitters) + Bench (1)
      // DH is not a required draft position anymore, just show for reference
      const filled =
        position === 'DH'
          ? 0 // DH is not drafted anymore
          : position === 'C' || position === '1B' || position === '2B' || position === '3B' || position === 'SS' || position === 'LF' || position === 'CF' || position === 'RF'
            ? Math.min(fixedFilled, required)
            : position === 'SP' || position === 'RP' || position === 'CL'
              ? Math.min(fixedFilled, required)
              : position === 'Bench'
                ? Math.min(benchFilled, benchCount)
                : fixedFilled

      accumulator[position] = {
        filled,
        required: position === 'DH' ? 0 : required,
        complete: position === 'DH' ? true : filled >= required,
      }

      return accumulator
    }, {})
  }, [teams, allPositions])

  const filteredPlayers = useMemo(() => {
    let filtered = availablePlayers.filter((p) => (p.firstName + ' ' + p.lastName).toLowerCase().includes(searchText.toLowerCase()))

    if (tabValue === 1) {
      // By Position tab
      if (positionFilter === 'HITTERS') {
        filtered = filtered.filter((p) => p.type === 'hitter')
      } else if (positionFilter === 'PITCHERS') {
        filtered = filtered.filter((p) => p.type === 'pitcher')
      } else if (positionFilter !== 'ALL') {
        filtered = filtered.filter((p) => p.position === positionFilter)
      }

      // Filter out satisfied positions if checkbox is enabled
      if (hideSatisfied) {
        filtered = filtered.filter((p) => !positionCompletion[p.position]?.complete)
      }
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortConfig.key] ?? 0
      const bVal = (b as any)[sortConfig.key] ?? 0
      const comparison = typeof aVal === 'string' || typeof bVal === 'string' ? String(aVal).localeCompare(String(bVal)) : aVal - bVal
      return sortConfig.direction === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [availablePlayers, searchText, tabValue, positionFilter, hideSatisfied, sortConfig, positionCompletion])

  useEffect(() => {
    setPage(0)
  }, [searchText, tabValue, positionFilter, hideSatisfied, sortConfig, availablePlayers.length])

  if (!isUserTurn) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Skeleton variant="rectangular" height={200} />
        <Typography sx={{ mt: 2 }}>CPU drafting...</Typography>
      </Box>
    )
  }

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  const pagedPlayers = filteredPlayers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', p: 2, overflow: 'hidden' }}>
      <Typography variant="h6" gutterBottom sx={{ flexShrink: 0, color: 'white' }}>
        {tabValue === 0 ? 'All Players' : positionFilter === 'ALL' ? 'Filter By Position' : `Position: ${positionFilter}`}
      </Typography>
      {tabValue === 1 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1, flexShrink: 0 }}>
          <Chip
            label="All"
            size="small"
            variant={positionFilter === 'ALL' ? 'filled' : 'outlined'}
            color={positionFilter === 'ALL' ? 'primary' : 'default'}
            onClick={() => setPositionFilter('ALL')}
          />
          <Chip
            label="All Hitters"
            size="small"
            variant={positionFilter === 'HITTERS' ? 'filled' : 'outlined'}
            color={positionFilter === 'HITTERS' ? 'primary' : 'default'}
            onClick={() => setPositionFilter('HITTERS')}
          />
          <Chip
            label="All Pitchers"
            size="small"
            variant={positionFilter === 'PITCHERS' ? 'filled' : 'outlined'}
            color={positionFilter === 'PITCHERS' ? 'primary' : 'default'}
            onClick={() => setPositionFilter('PITCHERS')}
          />
          {allPositions.map((position) => (
            <Chip
              key={position}
              label={position}
              size="small"
              variant={positionFilter === position ? 'filled' : 'outlined'}
              color={positionFilter === position ? 'primary' : 'default'}
              onClick={() => setPositionFilter(position)}
            />
          ))}
        </Stack>
      )}

      {tabValue === 1 && (
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center', flexShrink: 0 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Choose any position to narrow the list. The All Players tab ignores these filters.
          </Typography>
          <FormControlLabel
            control={<Checkbox size="small" checked={hideSatisfied} onChange={(e) => setHideSatisfied(e.target.checked)} />}
            label="Hide satisfied positions"
            sx={{ ml: 'auto', color: 'white' }}
          />
        </Stack>
      )}

      <TextField
        placeholder="Search by name..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        size="small"
        fullWidth
        sx={{
          mb: 2,
          flexShrink: 0,
          '& .MuiOutlinedInput-root': { color: 'white' },
          '& .MuiOutlinedInput-input::placeholder': { color: 'rgba(255, 255, 255, 0.6)', opacity: 1 },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.7)' }
        }}
      />

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0, '& .MuiTab-root': { color: 'white' } }}>
        <Tab label="All Players" />
        <Tab label="By Position" />
      </Tabs>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <TableContainer sx={{ width: '100%', height: '100%', minHeight: 0, overflow: 'auto' }}>
          <Table stickyHeader size="small" sx={{ minWidth: 1400 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <Tooltip title="Sort by player name">
                  <TableSortLabel active={sortConfig.key === 'firstName'} direction={sortConfig.direction} onClick={() => handleSort('firstName')}>
                    Name
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                <Tooltip title="Sort by age">
                  <TableSortLabel active={sortConfig.key === 'age'} direction={sortConfig.direction} onClick={() => handleSort('age')}>Age</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                <Tooltip title="Sort by position">
                  <TableSortLabel active={sortConfig.key === 'position'} direction={sortConfig.direction} onClick={() => handleSort('position')}>Pos</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                <Tooltip title="Overall rating">
                  <TableSortLabel active={sortConfig.key === 'overall'} direction={sortConfig.direction} onClick={() => handleSort('overall')}>OVR</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Contact (hit accuracy)">
                  <TableSortLabel active={sortConfig.key === 'contact'} direction={sortConfig.direction} onClick={() => handleSort('contact')}>CON</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Power (home run ability)">
                  <TableSortLabel active={sortConfig.key === 'power'} direction={sortConfig.direction} onClick={() => handleSort('power')}>POW</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Speed (base running)">
                  <TableSortLabel active={sortConfig.key === 'speed'} direction={sortConfig.direction} onClick={() => handleSort('speed')}>SPD</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Fielding">
                  <TableSortLabel active={sortConfig.key === 'fielding'} direction={sortConfig.direction} onClick={() => handleSort('fielding')}>FLD</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Arm strength">
                  <TableSortLabel active={sortConfig.key === 'arm'} direction={sortConfig.direction} onClick={() => handleSort('arm')}>ARM</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Discipline (plate discipline / strikeout avoidance)">
                  <TableSortLabel active={sortConfig.key === 'discipline'} direction={sortConfig.direction} onClick={() => handleSort('discipline')}>DISC</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Vision (batting eye / on-base ability)">
                  <TableSortLabel active={sortConfig.key === 'vision'} direction={sortConfig.direction} onClick={() => handleSort('vision')}>VIS</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Stuff (pitch quality)">
                  <TableSortLabel active={sortConfig.key === 'stuff'} direction={sortConfig.direction} onClick={() => handleSort('stuff')}>STU</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Control (pitch accuracy)">
                  <TableSortLabel active={sortConfig.key === 'control'} direction={sortConfig.direction} onClick={() => handleSort('control')}>CTRL</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Stamina (pitcher innings)">
                  <TableSortLabel active={sortConfig.key === 'stamina'} direction={sortConfig.direction} onClick={() => handleSort('stamina')}>STA</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  position: 'sticky',
                  right: 0,
                  zIndex: 5,
                  whiteSpace: 'nowrap',
                  backgroundColor: 'rgba(20, 30, 42, 1)',
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '-6px 0 8px -8px rgba(0, 0, 0, 0.55)',
                }}
              >
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedPlayers.map((player) => {
              const rowBg = positionCompletion[player.position]?.complete
                ? 'rgba(76, 175, 80, 0.08)'
                : positionCompletion[player.position]?.filled > 0
                  ? 'rgba(255, 193, 7, 0.08)'
                  : 'inherit'

              const rowHoverBg = positionCompletion[player.position]?.complete
                ? 'rgba(76, 175, 80, 0.14)'
                : positionCompletion[player.position]?.filled > 0
                  ? 'rgba(255, 193, 7, 0.14)'
                  : undefined

              const stickyCellBg = positionCompletion[player.position]?.complete
                ? 'rgba(30, 46, 37, 1)'
                : positionCompletion[player.position]?.filled > 0
                  ? 'rgba(56, 49, 26, 1)'
                  : 'rgba(20, 30, 42, 1)'

              const stickyCellHoverBg = positionCompletion[player.position]?.complete
                ? 'rgba(35, 56, 44, 1)'
                : positionCompletion[player.position]?.filled > 0
                  ? 'rgba(66, 58, 32, 1)'
                  : 'rgba(28, 40, 54, 1)'

              return (
              <TableRow
                key={player.id}
                hover
                sx={{
                  bgcolor: rowBg,
                  '&:hover': {
                    bgcolor: rowHoverBg,
                  },
                }}
              >
              <TableCell
                onClick={() => {
                  setSelectedPlayer(player)
                  setIsModalOpen(true)
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
                <TableCell align="right">{player.age}</TableCell>
                <TableCell align="right">{player.position}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {player.overall}
                </TableCell>
                <TableCell align="right">{player.type === 'hitter' ? player.contact ?? '-' : '-'}</TableCell>
                <TableCell align="right">{player.type === 'hitter' ? player.power ?? '-' : '-'}</TableCell>
                <TableCell align="right">{player.type === 'hitter' ? player.speed ?? '-' : '-'}</TableCell>
                <TableCell align="right">{player.type === 'hitter' ? player.fielding ?? '-' : '-'}</TableCell>
                <TableCell align="right">{player.type === 'hitter' ? player.arm ?? '-' : '-'}</TableCell>
                <TableCell align="right">{player.type === 'hitter' ? player.discipline ?? '-' : '-'}</TableCell>
                <TableCell align="right">{player.type === 'hitter' ? player.vision ?? '-' : '-'}</TableCell>
                <TableCell align="right">{player.type === 'pitcher' ? player.stuff ?? '-' : '-'}</TableCell>
                <TableCell align="right">{player.type === 'pitcher' ? player.control ?? '-' : '-'}</TableCell>
                <TableCell align="right">{player.type === 'pitcher' ? player.stamina ?? '-' : '-'}</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    position: 'sticky',
                    right: 0,
                    zIndex: 2,
                    backgroundColor: stickyCellBg,
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '-6px 0 8px -8px rgba(0, 0, 0, 0.55)',
                    '.MuiTableRow-root:hover &': {
                      backgroundColor: stickyCellHoverBg,
                    },
                  }}
                >
                  <Button size="small" variant="outlined" onClick={() => onDraftPlayer(player.id)}>
                    Draft
                  </Button>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <TablePagination
        component="div"
        count={filteredPlayers.length}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10))
          setPage(0)
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        sx={{ flexShrink: 0 }}
      />

      <PlayerRatingsModal open={isModalOpen} player={selectedPlayer} onClose={() => setIsModalOpen(false)} />
    </Box>
  )
}
