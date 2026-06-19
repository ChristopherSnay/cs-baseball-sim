import { useMemo, useState } from 'react'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, TableSortLabel, Tooltip } from '@mui/material'
import { useGame } from '../context/GameContext'
import { Team } from '../types'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { TeamRosterModal } from './TeamRosterModal'

interface StandingsTableProps {
  teams: Team[]
}

export function StandingsTable({ teams }: StandingsTableProps) {
  const { userTeamId } = useGame()
  const [orderBy, setOrderBy] = useState<string>('PCT')
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('desc')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const standings = useMemo(() => {
    const mapped = teams.map((team) => {
      const winPct = team.wins + team.losses > 0 ? (team.wins / (team.wins + team.losses)) : 0
      return { ...team, winPct }
    })

    const sorted = [...mapped].sort((a, b) => {
      let cmp = 0
      switch (orderBy) {
        case 'W':
          cmp = a.wins - b.wins
          break
        case 'L':
          cmp = a.losses - b.losses
          break
        case 'PCT':
          cmp = a.winPct - b.winPct
          break
        case 'TEAM':
          cmp = a.city.localeCompare(b.city) || a.nickname.localeCompare(b.nickname)
          break
        default:
          cmp = a.winPct - b.winPct
      }

      return orderDir === 'asc' ? cmp : -cmp
    })

    return sorted.map((team, idx) => {
      const winPctStr = ((team.winPct) * 1000).toFixed(0)
      const gamesBack = idx === 0 ? 0 : ((sorted[0].wins - team.wins + team.losses - sorted[0].losses) / 2).toFixed(1)
      return { ...team, winPct: winPctStr, gamesBack, rank: idx + 1 }
    })
  }, [teams, orderBy, orderDir])

  const handleRequestSort = (property: string) => {
    if (orderBy === property) setOrderDir(orderDir === 'asc' ? 'desc' : 'asc')
    else {
      setOrderBy(property)
      setOrderDir('desc')
    }
  }

  return (
    <>
      <TableContainer sx={{ height: '100%', minHeight: 0, overflowY: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Rank</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                <Tooltip title="Team city and nickname"> 
                  <TableSortLabel active={orderBy === 'TEAM'} direction={orderDir} onClick={() => handleRequestSort('TEAM')}>
                    Team
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                <Tooltip title="Wins"> 
                  <TableSortLabel active={orderBy === 'W'} direction={orderDir} onClick={() => handleRequestSort('W')}>W</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                <Tooltip title="Losses"> 
                  <TableSortLabel active={orderBy === 'L'} direction={orderDir} onClick={() => handleRequestSort('L')}>L</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                <Tooltip title="Win percentage"> 
                  <TableSortLabel active={orderBy === 'PCT'} direction={orderDir} onClick={() => handleRequestSort('PCT')}>PCT</TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                <Tooltip title="Games behind leader">
                  <span>GB</span>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {standings.map((team) => (
              <TableRow
                key={team.id}
                sx={{
                  bgcolor: team.id === userTeamId ? 'primary.dark' : 'inherit',
                  color: team.id === userTeamId ? 'white' : 'inherit',
                }}
              >
                <TableCell sx={{ fontWeight: team.rank === 1 ? 'bold' : 'normal' }}>
                  {team.rank === 1 ? <EmojiEventsIcon sx={{ mr: 1, fontSize: '1.2rem' }} /> : null}
                  {team.rank}
                </TableCell>
                <TableCell
                  onClick={() => {
                    setSelectedTeam(team)
                    setIsModalOpen(true)
                  }}
                  sx={{
                    cursor: 'pointer',
                    color: 'primary.main',
                    textDecoration: 'underline',
                    '&:hover': { fontWeight: 'bold' },
                  }}
                >
                  {`${team.city} ${team.nickname}`}
                </TableCell>
                <TableCell align="right">{team.wins}</TableCell>
                <TableCell align="right">{team.losses}</TableCell>
                <TableCell align="right">
                  <Box sx={{ fontWeight: 'bold' }}>
                    .{team.winPct}
                  </Box>
                </TableCell>
                <TableCell align="right">{team.rank === 1 ? '-' : team.gamesBack}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TeamRosterModal open={isModalOpen} team={selectedTeam} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
