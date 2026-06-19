import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Box,
  Button,
  TextField,
  Stack,
  TableSortLabel,
} from '@mui/material'
import { useGame } from '../context/GameContext'
import { Player, HitterStats, PitcherStats } from '../types'
import { PlayerRatingsModal } from './PlayerRatingsModal'

export function StatsLeaderboard() {
  const { teams, userTeamId } = useGame()
  const [subTabValue, setSubTabValue] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [orderBy, setOrderBy] = useState<string>('AVG')
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('desc')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Collect all players with stats
  const allPlayers = useMemo(() => {
    const players: Array<Player & { teamName: string }> = []
    teams.forEach((team) => {
      team.roster.forEach((player) => {
        if (player.stats) {
          players.push({
            ...player,
            teamName: `${team.city} ${team.nickname}`,
          })
        }
      })
    })
    return players
  }, [teams])

  // Comparator helpers
  const compareNumber = (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0)

  // Filter and sort hitters
  const hitters = useMemo(() => {
    let filtered = allPlayers.filter(
      (p) =>
        p.type === 'hitter' &&
        (p.firstName.toLowerCase().includes(searchText.toLowerCase()) || p.lastName.toLowerCase().includes(searchText.toLowerCase()) || p.teamName.toLowerCase().includes(searchText.toLowerCase()))
    )

    filtered.sort((a, b) => {
      const aStats = a.stats as HitterStats
      const bStats = b.stats as HitterStats
      let cmp = 0
      switch (orderBy) {
        case 'AVG':
          cmp = compareNumber(parseFloat(aStats.AVG), parseFloat(bStats.AVG))
          break
        case 'HR':
          cmp = compareNumber(aStats.HR, bStats.HR)
          break
        case 'RBI':
          cmp = compareNumber(aStats.RBI, bStats.RBI)
          break
        case 'R':
          cmp = compareNumber(aStats.R, bStats.R)
          break
        case 'OBP':
          cmp = compareNumber(parseFloat(aStats.OBP), parseFloat(bStats.OBP))
          break
        case 'SLG':
          cmp = compareNumber(parseFloat(aStats.SLG), parseFloat(bStats.SLG))
          break
        case 'OPS':
          cmp = compareNumber(parseFloat(aStats.OPS), parseFloat(bStats.OPS))
          break
        case 'SB':
          cmp = compareNumber(aStats.SB, bStats.SB)
          break
        case 'SO':
          cmp = compareNumber(aStats.SO, bStats.SO)
          break
        case 'PLAYER':
          cmp = a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
          break
        case 'TEAM':
          cmp = a.teamName.localeCompare(b.teamName)
          break
        default:
          cmp = compareNumber(parseFloat(aStats.AVG), parseFloat(bStats.AVG))
      }

      return orderDir === 'asc' ? cmp : -cmp
    })

    return showAll ? filtered : filtered.slice(0, 50)
  }, [allPlayers, searchText, showAll, orderBy, orderDir])

  // Filter and sort pitchers
  const pitchers = useMemo(() => {
    let filtered = allPlayers.filter(
      (p) =>
        p.type === 'pitcher' &&
        (p.firstName.toLowerCase().includes(searchText.toLowerCase()) || p.lastName.toLowerCase().includes(searchText.toLowerCase()) || p.teamName.toLowerCase().includes(searchText.toLowerCase()))
    )

    filtered.sort((a, b) => {
      const aStats = a.stats as PitcherStats
      const bStats = b.stats as PitcherStats
      let cmp = 0
      switch (orderBy) {
        case 'W':
          cmp = compareNumber(aStats.W, bStats.W)
          break
        case 'L':
          cmp = compareNumber(aStats.L, bStats.L)
          break
        case 'ERA':
          cmp = compareNumber(parseFloat(aStats.ERA), parseFloat(bStats.ERA))
          // lower ERA is better
          cmp = -cmp
          break
        case 'IP':
          cmp = compareNumber(aStats.IP, bStats.IP)
          break
        case 'SO':
          cmp = compareNumber(aStats.SO, bStats.SO)
          break
        case 'BB':
          cmp = compareNumber(aStats.BB, bStats.BB)
          break
        case 'WHIP':
          cmp = compareNumber(parseFloat(aStats.WHIP), parseFloat(bStats.WHIP))
          cmp = -cmp
          break
        case 'SV':
          cmp = compareNumber(aStats.SV, bStats.SV)
          break
        case 'PLAYER':
          cmp = a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
          break
        case 'TEAM':
          cmp = a.teamName.localeCompare(b.teamName)
          break
        default:
          cmp = compareNumber(parseFloat(aStats.ERA), parseFloat(bStats.ERA))
          cmp = -cmp
      }

      return orderDir === 'asc' ? cmp : -cmp
    })

    return showAll ? filtered : filtered.slice(0, 50)
  }, [allPlayers, searchText, showAll, orderBy, orderDir])

  const handleRequestSort = (property: string) => {
    if (orderBy === property) {
      setOrderDir(orderDir === 'asc' ? 'desc' : 'asc')
    } else {
      setOrderBy(property)
      setOrderDir('desc')
    }
  }

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField placeholder="Filter by player or team name..." value={searchText} onChange={(e) => setSearchText(e.target.value)} size="small" fullWidth />
        <Button variant={showAll ? 'contained' : 'outlined'} onClick={() => setShowAll(!showAll)} size="small">
          {showAll ? 'Show Top 50' : 'Show All'}
        </Button>
      </Stack>

      <Tabs value={subTabValue} onChange={(_, v) => setSubTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0, '& .MuiTab-root': { color: 'white' } }}>
        <Tab label="Batting" />
        <Tab label="Pitching" />
      </Tabs>

      {/* Batting Leaders */}
      {subTabValue === 0 && (
        <TableContainer sx={{ flex: 1, minHeight: 0, overflowY: 'auto', mt: 2 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Rank</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'PLAYER'} direction={orderDir} onClick={() => handleRequestSort('PLAYER')}>
                    Player
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'TEAM'} direction={orderDir} onClick={() => handleRequestSort('TEAM')}>
                    Team
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'AVG'} direction={orderDir} onClick={() => handleRequestSort('AVG')}>
                    AVG
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'HR'} direction={orderDir} onClick={() => handleRequestSort('HR')}>
                    HR
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'RBI'} direction={orderDir} onClick={() => handleRequestSort('RBI')}>
                    RBI
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'R'} direction={orderDir} onClick={() => handleRequestSort('R')}>
                    R
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'OBP'} direction={orderDir} onClick={() => handleRequestSort('OBP')}>
                    OBP
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'SLG'} direction={orderDir} onClick={() => handleRequestSort('SLG')}>
                    SLG
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'OPS'} direction={orderDir} onClick={() => handleRequestSort('OPS')}>
                    OPS
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'SB'} direction={orderDir} onClick={() => handleRequestSort('SB')}>
                    SB
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'SO'} direction={orderDir} onClick={() => handleRequestSort('SO')}>
                    SO
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {hitters.map((player, idx) => {
                const stats = player.stats as HitterStats
                return (
                  <TableRow key={player.id} sx={{ bgcolor: player.teamName.includes(userTeamId) ? 'primary.light' : 'inherit', color: player.teamName.includes(userTeamId) ? 'white' : 'inherit' }}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell
                      onClick={() => {
                        setSelectedPlayer(player)
                        setIsModalOpen(true)
                      }}
                      sx={{ cursor: 'pointer', color: player.teamName.includes(userTeamId) ? 'white' : 'primary.main', textDecoration: 'underline', '&:hover': { fontWeight: 'bold' } }}
                    >
                      {`${player.firstName} ${player.lastName}`}
                    </TableCell>
                    <TableCell>{player.teamName}</TableCell>
                    <TableCell align="right">{stats.AVG}</TableCell>
                    <TableCell align="right">{stats.HR}</TableCell>
                    <TableCell align="right">{stats.RBI}</TableCell>
                    <TableCell align="right">{stats.R}</TableCell>
                    <TableCell align="right">{stats.OBP}</TableCell>
                    <TableCell align="right">{stats.SLG}</TableCell>
                    <TableCell align="right">{stats.OPS}</TableCell>
                    <TableCell align="right">{stats.SB}</TableCell>
                    <TableCell align="right">{stats.SO}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pitching Leaders */}
      {subTabValue === 1 && (
        <TableContainer sx={{ flex: 1, minHeight: 0, overflowY: 'auto', mt: 2 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Rank</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'PLAYER'} direction={orderDir} onClick={() => handleRequestSort('PLAYER')}>
                    Player
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'TEAM'} direction={orderDir} onClick={() => handleRequestSort('TEAM')}>
                    Team
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'W'} direction={orderDir} onClick={() => handleRequestSort('W')}>
                    W
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'L'} direction={orderDir} onClick={() => handleRequestSort('L')}>
                    L
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'ERA'} direction={orderDir} onClick={() => handleRequestSort('ERA')}>
                    ERA
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'IP'} direction={orderDir} onClick={() => handleRequestSort('IP')}>
                    IP
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'SO'} direction={orderDir} onClick={() => handleRequestSort('SO')}>
                    SO
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'BB'} direction={orderDir} onClick={() => handleRequestSort('BB')}>
                    BB
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'WHIP'} direction={orderDir} onClick={() => handleRequestSort('WHIP')}>
                    WHIP
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel active={orderBy === 'SV'} direction={orderDir} onClick={() => handleRequestSort('SV')}>
                    SV
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pitchers.map((player, idx) => {
                const stats = player.stats as PitcherStats
                return (
                  <TableRow key={player.id} sx={{ bgcolor: player.teamName.includes(userTeamId) ? 'primary.light' : 'inherit', color: player.teamName.includes(userTeamId) ? 'white' : 'inherit' }}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell
                      onClick={() => {
                        setSelectedPlayer(player)
                        setIsModalOpen(true)
                      }}
                      sx={{ cursor: 'pointer', color: player.teamName.includes(userTeamId) ? 'white' : 'primary.main', textDecoration: 'underline', '&:hover': { fontWeight: 'bold' } }}
                    >
                      {`${player.firstName} ${player.lastName}`}
                    </TableCell>
                    <TableCell>{player.teamName}</TableCell>
                    <TableCell align="right">{stats.W}</TableCell>
                    <TableCell align="right">{stats.L}</TableCell>
                    <TableCell align="right">{stats.ERA}</TableCell>
                    <TableCell align="right">{stats.IP.toFixed(1)}</TableCell>
                    <TableCell align="right">{stats.SO}</TableCell>
                    <TableCell align="right">{stats.BB}</TableCell>
                    <TableCell align="right">{stats.WHIP}</TableCell>
                    <TableCell align="right">{stats.SV}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <PlayerRatingsModal open={isModalOpen} player={selectedPlayer} onClose={() => setIsModalOpen(false)} />
    </Box>
  )
}
