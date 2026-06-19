import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material'
import { Player } from '../types'

interface PlayerRatingsModalProps {
  open: boolean
  player: Player | null
  onClose: () => void
}

export function PlayerRatingsModal({ open, player, onClose }: PlayerRatingsModalProps) {
  if (!player) return null

  const RatingItem = ({ label, value }: { label: string; value: number | null }) => {
    if (value === null) return null

    const percentage = (value / 99) * 100

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {value}/99
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={percentage} sx={{ height: 8, borderRadius: 1 }} />
      </Box>
    )
  }

  const isHitter = player.type === 'hitter'

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {player.firstName} {player.lastName}
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {player.position} | Age {player.age} | Overall: {player.overall}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {isHitter ? (
            <>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
                Hitting Attributes
              </Typography>
              <RatingItem label="Contact" value={player.contact} />
              <RatingItem label="Power" value={player.power} />
              <RatingItem label="Speed" value={player.speed} />
              <RatingItem label="Discipline" value={player.discipline} />
              <RatingItem label="Vision" value={player.vision} />
              <RatingItem label="Fielding" value={player.fielding} />
              <RatingItem label="Arm" value={player.arm} />
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
                Pitching Attributes
              </Typography>
              <RatingItem label="Stuff" value={player.stuff} />
              <RatingItem label="Control" value={player.control} />
              <RatingItem label="Accuracy" value={player.accuracy} />
              <RatingItem label="Stamina" value={player.stamina} />
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
